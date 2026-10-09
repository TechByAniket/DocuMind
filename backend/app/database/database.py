
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is missing from the .env file")

# pool_pre_ping=True checks whether a pooled connection is still alive before using it
# engine manages connections between Python and PostgreSQL
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)

# SessionLocal will let us read and write document records
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False
)


if __name__ == "__main__":
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        print("Database connected successfully:", result.scalar())
