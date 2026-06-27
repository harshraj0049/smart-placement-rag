from rag.loader import pdf_load_and_chunk
from rag.embedder import EmbeddingModel
from rag.vector_store import create_vector_store
import os

def ingest_pdf_documents(pdf_path:str,collage_id:str):
    print("starting ingestion process")
    print(f"Loading documents from {pdf_path}")
    chunks=pdf_load_and_chunk(pdf_path=pdf_path,chunk_size=1000,chunk_overlap=100)
    print(f"Loaded the documents and chumked with {len(chunks)} chunks")

    print("embedding documents")
    em=EmbeddingModel()
    document_name=os.path.basename(pdf_path)
    print("Creating the vector store")
    vector_store=create_vector_store(chunks,em,collage_id,document_name)
    print(f"Ingestion complete. {len(chunks)} chunks stored.")
    return vector_store

