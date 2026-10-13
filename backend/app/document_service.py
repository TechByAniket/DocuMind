
import uuid

from app.chunker import chunk_pages
from app.document_processor import extract_text_from_pdf_bytes
from app.qdrant.vector_store import vector_store
from app.database.database import SessionLocal
from app.database.models import Document
from app.supabase_storage.storage_service import upload_pdf_bytes
import logging

logger = logging.getLogger(__name__)

def ingest_document(
    pdf_bytes: bytes,
    filename: str,
    user_id: str
) -> str:

    document_id = uuid.uuid4()
    storage_path = f"{user_id}/{document_id}.pdf"

    # 1. Create a new document record in PostgreSQL with status 'PROCESSING'
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
        # 2. Upload the original PDF to Supabase Storage
        upload_pdf_bytes(pdf_bytes, storage_path)

        # 3. Extract text from the PDF pages (in memory)
        pages = extract_text_from_pdf_bytes(pdf_bytes)

        # 4. Split the text into smaller chunks
        chunks = chunk_pages(pages)

        # 5. Save the chunks and metadata into Qdrant vector database
        if chunks:
            texts = []
            metadatas = []

            for chunk in chunks:
                texts.append(chunk["text"])
                metadatas.append({
                    "user_id": user_id,
                    "document_id": str(document_id),
                    "page_number": chunk["page_number"]
                })

            vector_store.add_texts(texts=texts, metadatas=metadatas)

        # 6. Mark the document as 'READY' in PostgreSQL
        with SessionLocal() as db:
            document = db.get(Document, document_id)
            document.page_count = len(pages)
            document.chunk_count = len(chunks)
            document.status = "READY"
            db.commit()

        return str(document_id)

    
    except Exception:
        logger.exception(
            "Document ingestion failed for document_id=%s",
            document_id
        )

        try:
            with SessionLocal() as db:
                document = db.get(Document, document_id)
                if document:
                    document.status = "FAILED"
                    db.commit()
        except Exception:
            logger.exception(
                "Failed to update document status to FAILED"
            )

        raise
