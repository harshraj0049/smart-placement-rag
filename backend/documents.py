import json
import os
import re
import tempfile
import time
from datetime import date
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import ValidationError

from backend.auth import get_current_user
from backend.rag_service import get_embedding_model, invalidate_chat_retrievers
from rag.ingest import (
    MAX_PDF_BYTES,
    DocType,
    DocumentMetadata,
    IngestError,
    NoticeType,
    ingest_document,
)


router = APIRouter(prefix="/api/documents", tags=["documents"])
UPLOAD_ROOT = Path(__file__).resolve().parents[1] / "data" / "uploads"


def _require_admin(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only college admins can manage documents.",
        )
    return user


def _college_directory(user: dict[str, Any], *, create: bool) -> Path:
    college_id = str(user.get("college_id", ""))
    if not re.fullmatch(r"[A-Za-z0-9_-]+", college_id):
        raise HTTPException(status_code=403, detail="The account has no valid college.")
    directory = UPLOAD_ROOT / college_id
    if create:
        directory.mkdir(parents=True, exist_ok=True)
    return directory


def _save_pdf(upload: UploadFile, directory: Path) -> Path:
    filename = (upload.filename or "").replace("\\", "/").rsplit("/", 1)[-1]
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=415, detail="Only PDF files are accepted.")

    descriptor, temporary_name = tempfile.mkstemp(prefix=".upload-", suffix=".pdf", dir=directory)
    temporary_path = Path(temporary_name)
    saved = False
    try:
        total_bytes = 0
        signature = bytearray()
        with os.fdopen(descriptor, "wb") as destination:
            while chunk := upload.file.read(64 * 1024):
                total_bytes += len(chunk)
                if total_bytes > MAX_PDF_BYTES:
                    raise HTTPException(status_code=413, detail="File is larger than 20 MB.")
                if len(signature) < 4:
                    signature.extend(chunk[: 4 - len(signature)])
                destination.write(chunk)

        if total_bytes == 0:
            raise HTTPException(status_code=422, detail="The uploaded file is empty.")
        if bytes(signature) != b"%PDF":
            raise HTTPException(status_code=422, detail="File is not a valid PDF.")
        saved = True
        return temporary_path
    finally:
        if not saved:
            temporary_path.unlink(missing_ok=True)


def _write_metadata(path: Path, payload: dict[str, Any]) -> None:
    descriptor, temporary_name = tempfile.mkstemp(prefix=".metadata-", suffix=".json", dir=path.parent)
    temporary_path = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as destination:
            json.dump(payload, destination, ensure_ascii=False)
        os.replace(temporary_path, path)
    finally:
        temporary_path.unlink(missing_ok=True)


@router.post("")
def upload_document(
    file: UploadFile = File(...),
    doc_type: DocType = Form(...),
    batch: str = Form(..., min_length=4, max_length=4, pattern=r"^\d{4}$"),
    title: str | None = Form(default=None, max_length=120),
    notice_date: date | None = Form(default=None),
    company: str | None = Form(default=None, max_length=100),
    notice_type: NoticeType | None = Form(default=None),
    job_role: str | None = Form(default=None, max_length=100),
    user: dict[str, Any] = Depends(_require_admin),
) -> dict[str, Any]:
    try:
        metadata = DocumentMetadata(
            doc_type=doc_type,
            batch=batch,
            title=title,
            notice_date=notice_date,
            company=company,
            notice_type=notice_type,
            job_role=job_role,
        )
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors()) from exc

    directory = _college_directory(user, create=True)
    temporary_path = _save_pdf(file, directory)
    original_filename = (file.filename or "document.pdf").replace("\\", "/").rsplit("/", 1)[-1]
    college_id = str(user["college_id"])

    try:
        try:
            result = ingest_document(
                str(temporary_path),
                original_filename,
                metadata,
                college_id,
                get_embedding_model(),
            )
        except IngestError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

        if result.status != "skipped":
            invalidate_chat_retrievers()

        if not re.fullmatch(r"[a-f0-9]{32}", result.document_id):
            raise RuntimeError("The ingestion pipeline returned an invalid document ID.")

        pdf_path = directory / f"{result.document_id}.pdf"
        os.replace(temporary_path, pdf_path)
        uploaded_at = int(time.time())
        _write_metadata(
            directory / f"{result.document_id}.json",
            {
                "document_id": result.document_id,
                "document_name": result.document_name,
                "original_filename": original_filename,
                "doc_type": metadata.doc_type.value,
                "company": metadata.company,
                "company_display": metadata.company,
                "notice_type": metadata.notice_type.value if metadata.notice_type else None,
                "job_role": metadata.job_role,
                "notice_date": metadata.notice_date.isoformat() if metadata.notice_date else None,
                "batch": metadata.batch,
                "status": "indexed",
                "chunks": result.chunks,
                "uploaded_at": uploaded_at,
                "ingested_at": uploaded_at,
            },
        )
        return {
            "status": result.status,
            "document_id": result.document_id,
            "document_name": result.document_name,
            "chunks": result.chunks,
        }
    finally:
        temporary_path.unlink(missing_ok=True)


@router.get("")
def list_documents(user: dict[str, Any] = Depends(_require_admin)) -> list[dict[str, Any]]:
    directory = _college_directory(user, create=False)
    if not directory.exists():
        return []

    documents = []
    for metadata_path in directory.glob("*.json"):
        try:
            metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise HTTPException(status_code=500, detail="Could not read stored document metadata.") from exc
        if metadata.get("document_id") != metadata_path.stem:
            raise HTTPException(status_code=500, detail="Stored document metadata is inconsistent.")
        documents.append(metadata)

    return sorted(documents, key=lambda document: document.get("uploaded_at", 0), reverse=True)