import uuid

from app.chunker import chunk_pages
from app.document_processor import extract_text_from_pdf
from app.qdrant.vector_store import vector_store


def ingest_document(
    file_path: str,
    user_id: str
) -> str:

    # Generate a unique ID for this document
    document_id = str(uuid.uuid4())

    # Extract text from PDF
    pages = extract_text_from_pdf(file_path)

    # Split pages into chunks
    chunks = chunk_pages(pages)

    # Prepare text and metadata
    texts = [chunk["text"] for chunk in chunks]

    metadatas = [
        {
            "user_id": user_id,
            "document_id": document_id,
            "page_number": chunk["page_number"]
        }
        for chunk in chunks
    ]

    # Store chunks + metadata in Qdrant
    vector_store.add_texts(
        texts=texts,
        metadatas=metadatas
    )

    return document_id


if __name__ == "__main__":
    document_id = ingest_document(
        "data/test.pdf",
        "test-user"
    )

    print(f"Document ingested successfully!")
    print(f"Document ID: {document_id}")