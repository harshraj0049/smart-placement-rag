from sentence_transformers import SentenceTransformer

class EmbeddingModel:
    def __init__(self,model_name:str='all-MiniLM-L6-v2'):
        print("Loading Embedding Model ............................")
        self.model=SentenceTransformer(model_name)
        print("Embeding Model Loaded")

    def embed_text(self,text:str)->list[float]:
        return self.model.encode(text).tolist()
    
    def embed_documents(self,documents:list[str])->list[list[float]]:
        return self.model.encode(documents).tolist()

    def embed_query(self, text: str) -> list[float]:
        return self.model.encode(text).tolist()


        