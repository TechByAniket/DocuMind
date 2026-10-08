from app.qdrant.vector_store import vector_store
from app.llm_service import generate_answer


def answer_question(question: str) -> dict:

    results = vector_store.similarity_search(
        question,
        k=3
    )

    context_parts = []
    sources = []

    for result in results:
        page_number = result.metadata.get("page_number")

        context_parts.append(
            f"[Page {page_number}]\n{result.page_content}"
        )

        sources.append({
            "page_number": page_number,
            "document_id": result.metadata.get("document_id")
        })

    context = "\n\n".join(context_parts)

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

    answer = generate_answer(prompt)

    return {
        "answer": answer,
        "sources": sources
    }


if __name__ == "__main__":
    question = "explain system architecture in 5 main points?"

    result = answer_question(question)

    print("\n--- Answer ---")
    print(result["answer"])

    print("\n--- Sources ---")

    for source in result["sources"]:
        print(
            f"Page: {source['page_number']}, "
            f"Document: {source['document_id']}"
        )