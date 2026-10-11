
import os

from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables from the .env file
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "documents")

# Make sure Supabase configuration is present
if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise RuntimeError(
        "SUPABASE_URL or SUPABASE_SERVICE_KEY is missing from .env"
    )

# Create the Supabase client
supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY
)


# Option 1: Upload a PDF file from a local disk path
def upload_pdf(file_path: str, storage_path: str) -> str:
    with open(file_path, "rb") as pdf_file:
        supabase.storage.from_(SUPABASE_BUCKET).upload(
            path=storage_path,
            file=pdf_file,
            file_options={
                "content-type": "application/pdf",
                "upsert": "false"
            }
        )
    return storage_path


# Option 2: Upload PDF bytes directly from memory
def upload_pdf_bytes(pdf_bytes: bytes, storage_path: str) -> str:
    supabase.storage.from_(SUPABASE_BUCKET).upload(
        path=storage_path,
        file=pdf_bytes,
        file_options={
            "content-type": "application/pdf",
            "upsert": "false"
        }
    )
    return storage_path

if __name__ == "__main__":
    print("Supabase Storage client initialized successfully.")
