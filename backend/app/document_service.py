
import uuid

from app.chunker import chunk_pages
from app.document_processor import extract_text_from_pdf
from app.qdrant.vector_store import vector_store
from app.database.database import SessionLocal
from app.database.models import Document


def ingest_document(file_path: str, filename: str, user_id: str) -> str:
    document_id = uuid.uuid4()

    # 1. Create a document record in PostgreSQL.
    with SessionLocal() as db:
        document = Document(
            id=document_id,
            user_id=user_id,
            filename=filename,
            status="PROCESSING"
        )

        db.add(document)
        db.commit()

    try:
        # 2. Extract text from the PDF.
        pages = extract_text_from_pdf(file_path)

        # 3. Split the extracted text into chunks.
        chunks = chunk_pages(pages)

        # 4. Store chunks and metadata in Qdrant.
        texts = [chunk["text"] for chunk in chunks]

        metadatas = [
            {
                "user_id": user_id,
                "document_id": str(document_id),
                "page_number": chunk["page_number"]
            }
            for chunk in chunks
        ]

        if texts:
            vector_store.add_texts(
                texts=texts,
                metadatas=metadatas
            )

        # 5. Mark the document as ready in PostgreSQL.
        with SessionLocal() as db:
            document = db.get(Document, document_id)
            document.page_count = len(pages)
            document.chunk_count = len(chunks)
            document.status = "READY"
            db.commit()

        return str(document_id)

    except Exception:
        # 6. Record processing failure.
        with SessionLocal() as db:
            document = db.get(Document, document_id)
            if document:
                document.status = "FAILED"
                db.commit()

        raise
