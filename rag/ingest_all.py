"""Bulk-ingest the T&P rules PDF and every company notice listed in data/notices/registry.json.

Usage:
    python -m rag.ingest_all            # ingest / update
    python -m rag.ingest_all --reset    # delete chroma_db first (do this once after a schema change)

Writes ingest_report.json and prints a count of chunks per doc_type and company,
which must match the number of files (Phase 1 "done when" check).
"""
import argparse
import json
import shutil
from collections import Counter
from pathlib import Path

from rag.ingest import DocumentMetadata, IngestError, ingest_document
from rag.vector_store import DEFAULT_PERSIST_DIR, get_vector_store

RULES_PDF = Path("data/rules/T&P Regulations_2027 Batch.pdf")
NOTICES_DIR = Path("data/notices")
REGISTRY = NOTICES_DIR / "registry.json"


def ingest_all(em, college_id: str = "kiit", batch: str = "2027",
               persist_dir: str = DEFAULT_PERSIST_DIR, data_root: Path = Path(".")) -> dict:
    report = {"added": [], "updated": [], "skipped": [], "failed": [], "unregistered": []}

    def _run(path: Path, meta: DocumentMetadata):
        try:
            res = ingest_document(path, path.name, meta, college_id, em, persist_dir=persist_dir)
            report[res.status].append(path.name)
        except (IngestError, Exception) as e:          # keep going; report every failure
            report["failed"].append({"file": path.name, "error": str(e)})

    rules = data_root / RULES_PDF
    _run(rules, DocumentMetadata(doc_type="tnp_rules", batch=batch,
                                 title="T&P Regulations 2027 Batch"))

    registry = json.loads((data_root / REGISTRY).read_text())["notices"]
    for pdf in sorted((data_root / NOTICES_DIR).glob("*.pdf")):
        entry = registry.get(pdf.name)
        if entry is None:
            report["unregistered"].append(pdf.name)    # add it to registry.json
            continue
        _run(pdf, DocumentMetadata(doc_type="company_notice", batch=batch, **entry))
    return report


def count_by_company(em, college_id: str = "kiit", persist_dir: str = DEFAULT_PERSIST_DIR) -> Counter:
    store = get_vector_store(em, college_id, persist_dir)
    metas = store.get(include=["metadatas"])["metadatas"]
    return Counter((m["doc_type"], m.get("company_display", "-")) for m in metas)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--reset", action="store_true", help="delete the vector store before ingesting")
    ap.add_argument("--college", default="kiit")
    args = ap.parse_args()

    if args.reset and Path(DEFAULT_PERSIST_DIR).exists():
        shutil.rmtree(DEFAULT_PERSIST_DIR)
        print(f"deleted {DEFAULT_PERSIST_DIR}")

    from rag.embedder import EmbeddingModel
    em = EmbeddingModel()
    report = ingest_all(em, college_id=args.college)
    Path("ingest_report.json").write_text(json.dumps(report, indent=2))
    print(json.dumps({k: len(v) for k, v in report.items()}, indent=2))
    for f in report["failed"]:
        print("FAILED:", f)
    for (doc_type, company), n in sorted(count_by_company(em, args.college).items()):
        print(f"{doc_type:15} {company:22} {n} chunks")
