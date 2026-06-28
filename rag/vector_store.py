from langchain_chroma import Chroma
import hashlib

def create_vector_store(chunks,embeddings,college_id:str="kiit",document_name:str="unknown"):
    collection_name=f"placement_{college_id}"
    persist_dir="./chroma_db"

    doc_id=hashlib.md5(document_name.encode()).hexdigest()
    vector_store=Chroma( 
        collection_name=collection_name,
        embedding_function=embeddings,
        persist_directory=persist_dir
    ) 

    existing=vector_store.get(where={"document_id":doc_id})
    if len(existing['ids']) >0:
        print(f"Document '{document_name}' already exists with {len(existing['ids'])} chunks. Skipping.")
        return vector_store

    for chunk in chunks:
        chunk.metadata["college_id"]=college_id
        chunk.metadata["document_name"]=document_name
        chunk.metadata["document_id"]=doc_id 
    
    vector_store.add_documents(documents=chunks)

    
    print(f"created new collection '{collection_name}' with {vector_store._collection.count()} chunks")
    return vector_store

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

