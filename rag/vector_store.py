from langchain_chroma import Chroma
import hashlib

def upsert_document(chunks, embeddings, college_id, document_name, content_hash):
    vector_store = Chroma(
        collection_name=f"placement_{college_id}",
        embedding_function=embeddings,
        persist_directory="./chroma_db",
    )
    doc_id = hashlib.md5(document_name.encode()).hexdigest()
    existing = vector_store.get(where={"document_id": doc_id})
    status = "added"
    if existing["ids"]:
        if existing["metadatas"][0].get("content_hash") == content_hash:
            return "skipped"
        vector_store.delete(ids=existing["ids"])
        status = "updated"
    for c in chunks:
        c.metadata["document_id"] = doc_id
        c.metadata["document_name"] = document_name
    vector_store.add_documents(documents=chunks)
    return status

def get_vector_store(embeddings,college_id:str="kiit"):
    collection_name=f"placement_{college_id}"
    persist_dir="./chroma_db"
    vector_store=Chroma(
        collection_name=collection_name,
        embedding_function=embeddings,
        persist_directory=persist_dir
    )
    print(f"loading existing collection :{collection_name} with {vector_store._collection.count()} chunks")
    return vector_store

