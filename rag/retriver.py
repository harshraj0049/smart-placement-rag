
def get_retriver(vector_store):
    retriver=vector_store.as_retriever(
        search_kwargs={"k":2}
    )
    return retriver