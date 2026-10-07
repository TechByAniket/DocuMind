import numpy
import os

from dotenv import load_dotenv
from langchain_google_genai import GoogleGenerativeAIEmbeddings
import numpy as np


load_dotenv()


embeddings = GoogleGenerativeAIEmbeddings(
    model="models/gemini-embedding-001",
    google_api_key=os.getenv("GEMINI_API_KEY")
)


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

    