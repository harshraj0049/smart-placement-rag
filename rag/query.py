from rag.loader import pdf_load_and_chunk
from rag.embedder import EmbeddingModel
from rag.vector_store import get_vector_store
from rag.retriver import get_retriver
from langchain.chat_models import init_chat_model
import os
from dotenv import load_dotenv

load_dotenv()

os.environ['GOOGLE_API_KEY']=os.getenv("GEMINI_API_KEY")

def query(user_query:str,collage_id:str,retriever):
    #retrive the documents 
    docs=retriever.invoke(user_query)

    for doc in docs:
        print(doc.page_content[:100])
        print(doc.metadata)

    context="\n\n".join([doc.page_content for doc in docs]) 

    #llm layer
    prompt = f"""You are a placement assistant for a university.
    Answer the question using ONLY the context provided below.
    If the answer is not in the context, say: "I don't have that information, please contact the T&P cell."  

    Answer with complete details from the context.
    Do not summarize numerical rules.
    Do not answer questions outside the context.
    When packages/LPA mentioned, provide the full number (e.g., 6 LPA, not "6") 


    Context:
    {context}

    Question: {user_query}
    """
    model=init_chat_model("google_genai:gemini-3.1-flash-lite")
    response=model.invoke(prompt)

    return response.content 




