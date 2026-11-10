from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter


def clean_text(text: str) -> str:
    """Repair text extracted from PDFs.

    PyPDF sometimes returns emoji as two separate UTF-16 surrogate halves
    (e.g. '\\ud83d\\ude80'). Python strings can hold them, but the embedding
    tokenizer rejects them ("TextEncodeInput must be Union[...]"), which is
    why the Springworks notice failed to ingest. Re-pair valid halves, then
    replace any lone half that is left.
    """
    return text.encode("utf-16", "surrogatepass").decode("utf-16", "replace")


def pdf_load_and_chunk(pdf_path: str, chunk_size: int = 500, chunk_overlap: int = 50):
    loader = PyPDFLoader(pdf_path)
    docs = loader.load()
    for d in docs:
        d.page_content = clean_text(d.page_content)

    splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size,
                                              chunk_overlap=chunk_overlap,
                                              length_function=len,
                                              separators=["\n\n", "\n", " ", ""])
    return splitter.split_documents(docs)


if __name__ == "__main__":
    chunks = pdf_load_and_chunk("data/rules/T&P Regulations_2027 Batch.pdf", 1000, 100)
    print(f"{len(chunks)} chunks")
