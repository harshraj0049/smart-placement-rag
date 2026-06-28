from rag.embedder import EmbeddingModel
from rag.vector_store import get_vector_store
from rag.retriver import get_retriver
from rag.ingest import ingest_pdf_documents
from rag.query import query
from test_query import TEST_QUERIES,CRITICAL_QUERIES

def main():
    print("Hello from smart-placement-rag!")
    #ingest the document
    ingest_pdf_documents(pdf_path="data/T&P Regulations_2027 Batch.pdf",collage_id="kiit")

    #setup embedding model
    em=EmbeddingModel()
    #setup vector store
    college_id="kiit"
    vector_store=get_vector_store(em,college_id)
    #setup retriver
    retriever=get_retriver(vector_store)

    '''for query_text in TEST_QUERIES:
        response=query(query_text,college_id="kiit",retriever=retriever)
        print(f"Query: {query_text}")
        print(f"Response: {response}")
        print("\n")'''
    for query_text in CRITICAL_QUERIES:
        response=query(query_text,college_id="kiit",retriever=retriever)
        print(f"Query: {query_text}")
        print(f"Response: {response}")
        print("\n")  

if __name__ == "__main__":
    main()
