from qdrant_client.http import model
from langchain_google_genai import GoogleGenerativeAI
import os

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()

llm = ChatGoogleGenerativeAI(
    model = "gemini-3.5-flash-lite",
    google_api_key = os.getenv("GEMINI_API_KEY"),
    temperature = 0
)

def generate_answer(prompt: str) -> str:
    response = llm.invoke(prompt)

    # Check if the response is a list of blocks
    if isinstance(response.content, list):
        return response.content[0]["text"]
        
    # Otherwise return it normally
    return response.content



if __name__ == "__main__":
    answer = generate_answer(
        "What is used for chat interfaces ?"
    )

    print(answer)