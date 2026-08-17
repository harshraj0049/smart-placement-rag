from langchain_community.retrievers import BM25Retriever
from langchain_classic.retrievers import EnsembleRetriever
from langchain_chroma import Chroma
from langchain_core.documents import Document

def get_vector_retriver(vector_store,k:int=3):
    retriver=vector_store.as_retriever(
        search_kwargs={"k":k}
    )
    return retriver

def get_bm25_retriever(chunks,k:int=3):
    bm25=BM25Retriever.from_documents(chunks,k=k)
    return bm25

def get_hybrid_retriver(vector_store:Chroma,k:int=3):

    all_docs=vector_store.get()
    docs=[
        Document(page_content=all_docs["documents"][i],metadata=all_docs["metadatas"][i]) for i in range (len(all_docs["ids"]))
    ]

    vector_retriver=get_vector_retriver(vector_store,k)

    bm25_retriever=get_bm25_retriever(docs,k)

    ensemble_retriever=EnsembleRetriever(retrievers=[vector_retriver,bm25_retriever],
                                weights=[0.5,0.5])
    return ensemble_retriever
