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
    api_key=QDRANT_API_KEY
)

# connects LangChain's vector-store abstraction to our Qdrant Cloud instance
vector_store = QdrantVectorStore(
    client = client,
    collection_name=COLLECTION_NAME,
    embedding=embeddings,
    vector_name="dense"
)

if __name__ == "__main__":
    texts = [
        "TCP provides reliable, connection-oriented communication."
    ]

    metadata = [
        {
            "page_number": 1,
            "document_id": "test-document"
        }
    ]

    vector_store.add_texts(
        texts=texts,
        metadatas=metadata
    )

    print("Chunk added to Qdrant Cloud!")