import fastapi
from fastapi import FastAPI

app = FastAPI(title="DocuMind")

@app.get("/")
def home():
    return {"message": "Welcom to DocuMind, your document chat assistant!"}