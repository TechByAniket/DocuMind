import numpy as np
import os
import random
import time
import logging

from dotenv import load_dotenv
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_core.embeddings import Embeddings

load_dotenv()

logger = logging.getLogger(__name__)

MAX_RETRIES = 3

gemini_embeddings = GoogleGenerativeAIEmbeddings(
    model="models/gemini-embedding-001",
    google_api_key=os.getenv("GEMINI_API_KEY"),
)


def retry_embedding(operation):
    for attempt in range(MAX_RETRIES + 1):
        try:
            return operation()

        except Exception as exc:
            error = str(exc).lower()

            if not any(word in error for word in ["429", "resource_exhausted", "rate limit"]):
                raise

            if attempt == MAX_RETRIES:
                raise

            delay = (2 ** attempt) + random.uniform(0, 0.5)

            logger.warning("Rate limited. Retrying in %.2f seconds.", delay)
            time.sleep(delay)


class RetryingEmbeddings(Embeddings):
    def embed_query(self, text: str) -> list[float]:
        return retry_embedding(
            lambda: gemini_embeddings.embed_query(text)
        )

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return retry_embedding(
            lambda: gemini_embeddings.embed_documents(texts)
        )


embeddings = RetryingEmbeddings()


def generate_embedding(text: str) -> list[float]:
    return embeddings.embed_query(text)



if __name__ == "__main__":
    vector1 = generate_embedding(
        "TCP ensures reliable data transmission."
    )

    vector2 = generate_embedding(
        "TCP is a connection-oriented network protocol."
    )

    print(f"Vector1 dimensions: {len(vector1)}")
    print("Vector1 values:", vector1[:10])

    print("\n Vector2 ----------------------")
    print(f"Vector2 dimensions: {len(vector2)}")
    print("Vector2 values:", vector2[:10])

    print("\n Numpy embeddings similarity : ", np.dot(vector1, vector2) / (np.linalg.norm(vector1) * np.linalg.norm(vector2)))

    