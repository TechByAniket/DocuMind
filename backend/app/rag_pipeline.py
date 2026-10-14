from app.qdrant.vector_store import vector_store
from app.llm_service import generate_answer
from qdrant_client.http.models import (
    Filter,
    FieldCondition,
    MatchValue,
)


def answer_question(
    question: str,
    document_id: str,
    user_id: str,
) -> dict:

    results = vector_store.similarity_search(
        question,
        k=3,
        filter=Filter(
            must=[
                FieldCondition(
                    key="metadata.document_id",
                    match=MatchValue(value=document_id),
                ),
                FieldCondition(
                    key="metadata.user_id",
                    match=MatchValue(value=user_id),
                ),
            ]
        ),
    )

    print("Requested document_id:", document_id)
    print("Requested user_id:", user_id)

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

    print("Retrieved chunks:", len(results))
    print("Context length:", len(context))
    # print("Retrieved context:\n", context)
    # print("Context preview:", context[:200].encode("ascii", errors="replace").decode("ascii"))

    prompt = f"""
    You are a document question-answering assistant.

    Answer the user's question using only the provided context.

    For questions with multiple parts:
    - Answer each part that is supported by the context.
    - If a part cannot be answered from the context, clearly state that the information is not available in the provided document.
    - Never invent missing facts or use outside knowledge.
    - Use the fallback message only when none of the question can be answered from the context:
      "I couldn't find the answer in the provided document."

    Context:
    {context}

    Question:
    {question}

    Answer:
    """

    answer = generate_answer(prompt)

    if "I couldn't find the answer in the provided document." in answer:
        sources = []

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