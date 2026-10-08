import fastapi
from fastapi import FastAPI

from app.rag_pipeline import answer_question
from app.schemas import ChatRequest

app = FastAPI(title="DocuMind")

@app.get("/")
def home():
    return {"message": "Welcom to DocuMind, your document chat assistant!"}

@app.post("/api/chat")
def chat(request : ChatRequest):
    return answer_question(request.question)