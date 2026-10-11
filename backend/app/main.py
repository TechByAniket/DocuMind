from fastapi import FastAPI, HTTPException, UploadFile, File

from app.database.database import SessionLocal
from app.database.models import Document
from app.document_service import ingest_document
from app.rag_pipeline import answer_question
from app.schemas import ChatRequest
from fastapi.middleware.cors import CORSMiddleware

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
def chat(request: ChatRequest):
    return answer_question(request.question)


# 10 MB file size limit (10 * 1024 * 1024 bytes)
MAX_PDF_SIZE = 10 * 1024 * 1024


@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...)):
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
            "test-user"
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
        raise HTTPException(
            status_code=500,
            detail="Document processing failed."
        )

    finally:
        await file.close()



@app.get("/api/documents")
def list_documents():
    with SessionLocal() as db:
        documents = (
            db.query(Document)
            .filter(Document.user_id == "test-user")
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
                "created_at": document.created_at.isoformat()
                if document.created_at
                else None
            }
            for document in documents
        ]