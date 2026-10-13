from pydantic import BaseModel


class ChatRequest(BaseModel):
    question: str
    document_id: str