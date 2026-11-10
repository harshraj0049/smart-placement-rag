import hashlib, re, time
from datetime import date
from enum import Enum
from pathlib import Path
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from rag.loader import pdf_load_and_chunk
from rag.vector_store import upsert_document

INGEST_VERSION = "v1-c1000-o100-minilm"   # bump when chunking, header or embedding model changes
MAX_PDF_BYTES = 20 * 1024 * 1024


class DocType(str, Enum):
    tnp_rules = "tnp_rules"
    company_notice = "company_notice"
    placement_faq = "placement_faq"

class NoticeType(str, Enum):
    # shortlist/result still deliberately absent (student PII)
    registration = "registration"
    job_description = "job_description"
    eligibility = "eligibility"
    ppt = "ppt"
    schedule = "schedule"
    update = "update"
    general = "general"

class DocumentMetadata(BaseModel):
    """The contract between the admin's form and the backend."""
    doc_type: DocType
    batch: str = Field(pattern=r"^\d{4}$")                 # graduating batch, e.g. "2027"
    company: Optional[str] = Field(default=None, max_length=100)
    notice_type: Optional[NoticeType] = None
    title: Optional[str] = Field(default=None, max_length=120)
    notice_date: Optional[date] = None
    job_role: Optional[str] = Field(default=None, max_length=100)

    @field_validator("company", "title", "job_role", mode="before")
    @classmethod
    def clean(cls, v):
        if v is None:
            return None
        v = re.sub(r"\s+", " ", str(v)).strip()
        return v or None                                    # "" from an empty form field -> None

    @model_validator(mode="after")
    def check_required(self):
        if self.doc_type == DocType.company_notice and not (self.company and self.notice_type):
            raise ValueError("company and notice_type are required for company notices")
        return self


class IngestError(Exception):
    """Problems the admin can fix (bad file, scanned PDF). The router maps this to HTTP 422."""


class IngestResult(BaseModel):
    status: Literal["added", "updated", "skipped"]
    document_id: str
    document_name: str
    chunks: int


def ingest_document(file_path, original_filename: str, meta: DocumentMetadata,
                    college_id: str, em, persist_dir: str = "./chroma_db") -> IngestResult:
    path = Path(file_path)
    raw = path.read_bytes()
    if len(raw) > MAX_PDF_BYTES:
        raise IngestError("File is larger than 20 MB.")
    if not raw.startswith(b"%PDF"):
        raise IngestError("File is not a valid PDF.")

    try:
        chunks = pdf_load_and_chunk(str(path), 1000, 100)
    except Exception as e:
        raise IngestError(f"Could not read the PDF: {e}")
    if sum(len(c.page_content.strip()) for c in chunks) < 50:
        raise IngestError("No extractable text. This looks like a scanned PDF.")

    # Document identity comes from the metadata, not the filename.
    # Re-uploading the same company/notice type/batch replaces the old version.
    is_notice = meta.doc_type == DocType.company_notice
    parts = [meta.doc_type.value, meta.batch]
    if is_notice:
        parts += [meta.company.lower(), meta.notice_type.value]
    if meta.title:
        parts.append(meta.title.lower())
    document_key = "|".join(parts)

    file_hash = hashlib.sha256(raw).hexdigest()
    document_id = hashlib.md5(document_key.encode()).hexdigest()
    document_name = meta.title or original_filename      # contract: original or admin-provided title

    base = {
        "college_id": college_id,
        "doc_type": meta.doc_type.value,
        "batch": meta.batch,
        "document_id": document_id,
        "document_name": document_name,
        "content_hash": file_hash,
        "ingest_version": INGEST_VERSION,
        "ingested_at": int(time.time()),
    }
    if is_notice:                                         # omitted entirely for rules and FAQs
        base["company"] = meta.company.lower()
        base["company_display"] = meta.company
        base["notice_type"] = meta.notice_type.value
        if meta.job_role:
            base["job_role"] = meta.job_role
    if meta.notice_date:                                  # proposed addition, see below
        base["notice_date"] = int(meta.notice_date.strftime("%Y%m%d"))

    if is_notice:
        header = f"[Company: {meta.company} | Notice: {meta.notice_type.value}]"
    else:
        default = "Placement FAQ" if meta.doc_type == DocType.placement_faq else "T&P Rules and Regulations"
        header = f"[Document: {meta.title or default}]"

    for i, c in enumerate(chunks):                        # whitelist; drops PDF noise and page_label
        c.metadata = {**base, "page": c.metadata.get("page", 0),
                      "chunk_index": i, "chunk_id": f"{document_id}:{i}"}
        c.page_content = f"{header}\n{c.page_content}"

    status = upsert_document(chunks, em, college_id, document_id, file_hash, persist_dir=persist_dir)
    return IngestResult(status=status, document_id=document_id,
                        document_name=document_name, chunks=len(chunks))