from pathlib import Path
from rag.loader import pdf_load_and_chunk
from rag.embedder import EmbeddingModel
from rag.vector_store import get_vector_store
from rag.ingest import ingest_pdf_documents

def ingest_rules(pdf_path: str, college_id: str = "kiit"):
    em = EmbeddingModel()
    chunks = pdf_load_and_chunk(pdf_path, chunk_size=1000, chunk_overlap=100)
    for c in chunks:
        c.metadata["doc_type"] = "tnp_rules"
        c.page_content = f"[Document: T&P Rules and Regulations]\n{c.page_content}"
    get_vector_store(chunks, em, college_id=college_id, document_name=Path(pdf_path).name)
    print(f"Rules ingested: {len(chunks)} chunks")

if __name__ == "__main__":
    ingest_rules("data/rules/T&P Regulations_2027 Batch.pdf")
    ingest_pdf_documents("data/notices", college_id="kiit", doc_type="company_notice")