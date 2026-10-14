
from qdrant_client.models import Filter, FieldCondition, MatchValue
from app.supabase_storage.storage_service import SUPABASE_BUCKET
from app.authentication.auth import supabase
from app.qdrant.vector_store import COLLECTION_NAME
from app.qdrant.vector_store import client
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
    pdf_uploaded = False

    # 1. Create the document record in PostgreSQL
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
        pdf_uploaded = True

        # 3. Extract text from the PDF
        pages = extract_text_from_pdf_bytes(pdf_bytes)

        # 4. Split extracted text into chunks
        chunks = chunk_pages(pages)

        if not chunks:
            raise ValueError(
                "No extractable text found in the PDF."
            )

        # 5. Prepare chunk text and metadata for Qdrant
        texts = []
        metadatas = []

        for chunk in chunks:
            texts.append(chunk["text"])
            metadatas.append({
                "user_id": user_id,
                "document_id": str(document_id),
                "page_number": chunk["page_number"],
            })

        # 6. Store vectors in Qdrant
        vector_store.add_texts(
            texts=texts,
            metadatas=metadatas,
        )

        # 7. Mark the document as READY in PostgreSQL
        with SessionLocal() as db:
            document = db.get(Document, document_id)

            if document is None:
                raise RuntimeError(
                    "Document record disappeared during ingestion."
                )

            document.page_count = len(pages)
            document.chunk_count = len(chunks)
            document.status = "READY"
            db.commit()

        return str(document_id)

    except Exception:
        # Log the original ingestion error
        logger.exception(
            "Document ingestion failed for document_id=%s",
            document_id,
        )

        # 8. Attempt to remove partial Qdrant and Storage data
        try:
            cleanup_failed_ingestion(
                document_id=str(document_id),
                user_id=user_id,
                storage_path=storage_path,
                pdf_uploaded=pdf_uploaded,
            )
        except Exception:
            logger.exception(
                "Cleanup failed for document_id=%s",
                document_id,
            )

        # 9. Preserve the document record as FAILED
        try:
            with SessionLocal() as db:
                document = db.get(Document, document_id)

                if document is not None:
                    document.status = "FAILED"
                    db.commit()

        except Exception:
            logger.exception(
                "Failed to update document status to FAILED "
                "for document_id=%s",
                document_id,
            )

        # Re-raise the original exception for FastAPI
        raise



def cleanup_failed_ingestion(
    document_id: str,
    user_id: str,
    storage_path: str,
    pdf_uploaded: bool,
) -> None:
    """Remove partial Qdrant vectors and the uploaded PDF."""

    # 1. Remove vectors belonging to this document and user.
    try:
        client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=Filter(
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
            wait=True,
        )
    except Exception:
        logger.exception(
            "Failed to clean up Qdrant vectors for document_id=%s",
            document_id,
        )

    # 2. Remove the PDF if the Storage upload succeeded.
    if pdf_uploaded:
        try:
            supabase.storage.from_(SUPABASE_BUCKET).remove(
                [storage_path]
            )
        except Exception:
            logger.exception(
                "Failed to clean up Storage file for document_id=%s",
                document_id,
            )