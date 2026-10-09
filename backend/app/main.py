from uuid import uuid4
from pathlib import Path
from fastapi import HTTPException
from app.document_service import ingest_document
from fastapi import File
from fastapi import UploadFile
import fastapi
from fastapi import FastAPI

from app.rag_pipeline import answer_question
from app.schemas import ChatRequest

app = FastAPI(title="DocuMind")

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@app.get("/")
def home():
    return {"message": "Welcom to DocuMind, your document chat assistant!"}


@app.post("/api/chat")
def chat(request : ChatRequest):
    return answer_question(request.question)


@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename or Path(file.filename).suffix.lower() != ".pdf":
        raise HTTPException(
            status_code=400,
            detail="Please upload a PDF file."
        )

    file_path = UPLOAD_DIR / f"{uuid4()}.pdf"

    try:
        with file_path.open("wb") as buffer:
            while content := await file.read(1024 * 1024):
                buffer.write(content)

        document_id = ingest_document(
            str(file_path),
            file.filename,
            "test-user"
        )

        return {
            "message": "Document uploaded successfully",
            "document_id": document_id,
            "filename": file.filename,
            "status": "READY"
        }

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Document processing failed."
        )

    finally:
        file_path.unlink(missing_ok=True)
        await file.close()