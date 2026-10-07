import os

from dotenv import load_dotenv
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient

# Gemini embedding model from embedding_service.py.
from app.embedding_service import embeddings

load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")

COLLECTION_NAME = "documind_documents"

client = QdrantClient(
    url=QDRANT_URL,
    api_key=QDRANT_API_KEY, 
    timeout=60
)

# connects LangChain's vector-store abstraction to our Qdrant Cloud instance
vector_store = QdrantVectorStore(
    client = client,
    collection_name=COLLECTION_NAME,
    embedding=embeddings,
    vector_name="dense"
)

if __name__ == "__main__":
    from app.document_processor import extract_text_from_pdf
    from app.chunker import chunk_pages

    # pages = extract_text_from_pdf("data/test.pdf")

    # chunks = chunk_pages(pages)

    # texts = [chunk["text"] for chunk in chunks]

    # metadatas = [
    #     {
    #         "user_id": "test-user",
    #         "document_id": "test-document",
    #         "page_number": chunk["page_number"]
    #     }
    #     for chunk in chunks
    # ]

    # vector_store.add_texts(
    #     texts=texts,
    #     metadatas=metadatas
    # )

    # print(f"Added {len(chunks)} chunks to Qdrant Cloud!")

    results = vector_store.similarity_search(
        "The architecture is designed in how many layers?",
        k=1
    )

    print("\n--- Retrieved Chunks ---")

    for i, result in enumerate(results, start=1):
        print(f"\nChunk {i}")
        print(f"Page: {result.metadata.get('page_number')}")
        print(f"Document: {result.metadata.get('document_id')}")
        print(result.page_content)