import os

from dotenv import load_dotenv
from qdrant_client import QdrantClient


load_dotenv()


client = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY")
)


if __name__ == "__main__":
    collections = client.get_collections()

    print("Connected to Qdrant Cloud!")
    print(f"Collections: {len(collections.collections)}")