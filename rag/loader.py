from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter



def pdf_load_and_chunk(pdf_path:str,chunk_size:int =500,chunk_overlap:int =50):
    loader=PyPDFLoader(pdf_path)
    docs=loader.load()

    print(f"pages in the document:{len(docs)}")
    """for pages in docs:
        print(pages.page_content,"\n")"""

    splitter=RecursiveCharacterTextSplitter(chunk_size=chunk_size,chunk_overlap=chunk_overlap,length_function=len)
    chunks=splitter.split_documents(docs)

    print(f"Number of chunks : {len(chunks)}\n")
    for i,chunk in enumerate(chunks):
        print("chunk number",i,chunk.page_content[:100])
        print("metadata",chunk.metadata) 

    return chunks


if(__name__=="__main__"):
    pdf_load_and_chunk("data/T&P Regulations_2027 Batch.pdf",1000,200)


