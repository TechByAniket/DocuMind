from fastapi import Depends
from app.authentication.auth import get_current_user
# from fastapi import Depends
from fastapi import FastAPI, HTTPException, UploadFile, File

from app.database.database import SessionLocal
from app.database.models import Document
from app.document_service import ingest_document
from app.rag_pipeline import answer_question
from app.schemas import ChatRequest
from fastapi.middleware.cors import CORSMiddleware
import logging

logger = logging.getLogger(__name__)

app = FastAPI(title="DocuMind")

# Tell the browser which origins are allowed to call this API.
# During development, we allow the Vite dev server origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],   # GET, POST, PUT, DELETE, OPTIONS, etc.
    allow_headers=["*"],   # Authorization, Content-Type, etc.
)



@app.get("/")
def home():
    return {"message": "Welcom to DocuMind, your document chat assistant!"}


@app.post("/api/chat")
def chat(
    request: ChatRequest, 
    current_user: dict = Depends(get_current_user),
):
    with SessionLocal() as db:
        document = (
            db.query(Document)
            .filter(
                Document.id == request.document_id,
                Document.user_id == current_user["id"],
            )
            .first()
        )

        if document is None:
            raise HTTPException(
                status_code=404,
                detail="Document not found."
            )
    return answer_question(
    request.question,
    request.document_id,
    current_user["id"],
    )



    


# 10 MB file size limit (10 * 1024 * 1024 bytes)
MAX_PDF_SIZE = 10 * 1024 * 1024


@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    # 1. Check if the user selected a file and if it ends with .pdf
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a PDF file."
        )

    try:
        # 2. Read the file content into memory
        pdf_bytes = await file.read()

        # 3. Check if the file is larger than 10 MB
        if len(pdf_bytes) > MAX_PDF_SIZE:
            raise HTTPException(
                status_code=413,
                detail="PDF exceeds the 10 MB limit."
            )

        # 4. Check if it is a real PDF (valid PDFs always start with '%PDF-')
        if not pdf_bytes.startswith(b"%PDF-"):
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is not a valid PDF."
            )

        document_id = ingest_document(
            pdf_bytes,
            file.filename,
            current_user["id"]
        )

        return {
            "message": "Document uploaded successfully",
            "document_id": document_id,
            "filename": file.filename,
            "status": "READY"
        }

    except HTTPException:
        raise

    except Exception:
        logger.exception("Document processing failed during upload")
        raise HTTPException(
            status_code=500,
            detail="Document processing failed."
        )

    finally:
        await file.close()



#FastAPI will now execute get_current_user() before running list_documents(). 
# If authentication fails, the endpoint won't return the documents.
@app.get("/api/documents")
def list_documents(current_user:dict = Depends(get_current_user)):
    with SessionLocal() as db:
        documents = (
            db.query(Document)
            .filter(Document.user_id == current_user["id"])
            .order_by(Document.created_at.desc())
            .all()
        )

        return [
            {
                "document_id": str(document.id),
                "filename": document.filename,
                "status": document.status,
                "page_count": document.page_count,
                "chunk_count": document.chunk_count,
                "created_at": document.created_at.isoformat() if document.created_at else None
            }
            for document in documents
        ]