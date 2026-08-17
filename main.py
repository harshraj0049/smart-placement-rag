from rag.embedder import EmbeddingModel
from rag.vector_store import get_vector_store
from rag.retriver import get_hybrid_retriver
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
    #retriever=get_retriver(vector_store)
    hybrid_retriever=get_hybrid_retriver(vector_store,k=4) 

    query_text="So I had this one question okay, and a doubt regarding the T&P Regulations where it was mentioned that students who are placed in category 1 can sit for category 2 only if the CTC is 1.5x more than the previous CTC, which was understood.But then again in the pdf it was mentioned that a student is bound to accept the first offer that he or she gets. So suppose (hyphothetical situation), a student has got an offer in a company with 6lpa and the joining date is in July, and then the same student sits for another company  with 10LPA while working there and gets the offer too and joining is August, so will the student be allowed to switch from T&P office? Apart from that I realise it’s the students sole responsibility to handle the situation but I just wanted to know from the Placement cell’s perspective."

    new_query="Suppose I have secured two job offers TCS and infosys. I am not satisfied with my job roles and its salary so i declined both job offers  and now i am planning to sit in product based companies which have higher salaries and future opportunities.can i sit in the placement proces for the product based companies?"
    response=query(new_query,college_id="kiit",retriever=hybrid_retriever)
    print(f"Query: {new_query}")
    print(f"Response: {response}")
    print("\n")
# for query_text in TEST_QUERIES:
#       response=query(query_text,college_id="kiit",retriever=hybrid_retriever)
#       print(f"Query: {query_text}")
#       print(f"Response: {response}")
#       print("\n")
    
#    for query_text in CRITICAL_QUERIES:
#       response=query(query_text,college_id="kiit",retriever=hybrid_retriever)
#       print(f"Query: {query_text}")
#       print(f"Response: {response}")
#       print("\n")
    

if __name__ == "__main__":
    main()
