from app.qdrant.vector_store import vector_store
from app.llm_service import generate_answer


def answer_question(question: str) -> str:

    # 1. Retrieve relevant chunks
    results = vector_store.similarity_search(
        question,
        k=3
    )

    # 2. Combine retrieved chunks into context
    context = "\n\n".join(
        result.page_content
        for result in results
    )

    # 3. Build prompt
    prompt = f"""
You are a document question-answering assistant.

Answer the user's question using only the provided context.

If the answer cannot be found in the context, say:
"I couldn't find the answer in the provided document."

Context:
{context}

Question:
{question}

Answer:
"""

    # 4. Generate answer
    return generate_answer(prompt)


if __name__ == "__main__":
    question = "What types of inputs the proposed system handle?"

    answer = answer_question(question)

    print("\n--- Answer ---")
    print(answer)