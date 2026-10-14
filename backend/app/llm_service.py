import os

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()

llm = ChatGoogleGenerativeAI(
    model="gemini-3.5-flash-lite",
    google_api_key=os.getenv("GEMINI_API_KEY"),
    temperature=0,
)

def generate_answer(prompt: str) -> str:
    response = llm.invoke(prompt)

    if isinstance(response.content, list):
        return "".join(
            block["text"]
            for block in response.content
            if isinstance(block, dict) and "text" in block
        )

    return response.content


def stream_answer(prompt: str):
    for chunk in llm.stream(prompt):
        content = chunk.content

        if isinstance(content, str):
            if content:
                yield content
        elif isinstance(content, list):
            for block in content:
                if isinstance(block, dict) and "text" in block:
                    yield block["text"]


if __name__ == "__main__":
    for text in stream_answer("Explain what a chat interface is in two sentences."):
        print(text, end="", flush=True)

    print()
