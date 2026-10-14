from app.qdrant.vector_store import vector_store
from app.llm_service import generate_answer, stream_answer
from qdrant_client.http.models import (
    Filter,
    FieldCondition,
    MatchValue,
)
import re


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

    # print("Requested document_id:", document_id)
    # print("Requested user_id:", user_id)

    
    context_parts = []
    sources = []

    for index, result in enumerate(results, start=1):
        page_number = result.metadata.get("page_number")

        context_parts.append(
            f"[Source {index} | Page {page_number}]\n"
            f"{result.page_content}"
        )

        sources.append({
            "source_id": index,
            "page_number": page_number,
            "document_id": result.metadata.get("document_id"),
        })

    context = "\n\n".join(context_parts)


    print("Retrieved chunks:", len(results))
    print("Context length:", len(context))
    # print("Retrieved context:\n", context)
    # print("Context preview:", context[:200].encode("ascii", errors="replace").decode("ascii"))

    
    prompt = f"""
    You are a document question-answering assistant.

    Answer the user's question using only the provided context.

    Rules:
    - Answer each part of a multi-part question that is supported by the context.
    - If a part cannot be answered, clearly state that the information is not available in the provided document.
    - Never invent facts or use outside knowledge.
    - Do not include source IDs, source labels, or inline citations in the answer.
    - If none of the question can be answered from the context, respond exactly:
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
        "sources": sources,
    }

def stream_answer_question(
    question: str,
    document_id: str,
    user_id: str,
):
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

    context_parts = []

    for result in results:
        page_number = result.metadata.get("page_number")
        context_parts.append(
            f"[Page {page_number}]\n{result.page_content}"
        )

    context = "\n\n".join(context_parts)

    prompt = f"""
    You are a document question-answering assistant.

    Answer the user's question using only the provided context.

    Rules:
    - Answer each part of a multi-part question that is supported by the context.
    - If a part cannot be answered, clearly state that the information is not available in the provided document.
    - Never invent facts or use outside knowledge.
    - Do not include source IDs, source labels, or inline citations in the answer.
    - If none of the question can be answered from the context, respond exactly:
      "I couldn't find the answer in the provided document."

    Context:
    {context}

    Question:
    {question}

    Answer:
    """

    yield from stream_answer(prompt)


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