from functools import lru_cache

from rag.embedder import EmbeddingModel
from rag.retriver import get_hybrid_retriver
from rag.vector_store import get_vector_store


@lru_cache(maxsize=1)
def get_embedding_model() -> EmbeddingModel:
    return EmbeddingModel()


@lru_cache(maxsize=8)
def get_chat_retriever(college_id: str):
    vector_store = get_vector_store(get_embedding_model(), college_id=college_id)
    return get_hybrid_retriver(vector_store, k=4)


def invalidate_chat_retrievers() -> None:
    get_chat_retriever.cache_clear()
