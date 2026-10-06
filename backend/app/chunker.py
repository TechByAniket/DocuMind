# =====================================
# Split text into chunks
# =====================================

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    chunks = []

    start = 0

    while start < len(text):
        end = start + chunk_size

        chunk = text[start:end]
        chunks.append(chunk)

        start = end - overlap

    return chunks


if __name__ == "__main__":
    text = "ABCDEFGHIJKLMNOPQRSTUVWXYZ" * 100

    chunks = chunk_text(text, chunk_size=100, overlap=20)

    print(f"Created {len(chunks)} chunks.")

    for i, chunk in enumerate(chunks):
        print(f"\n--- Chunk {i + 1} ---")
        print(f"Length: {len(chunk)}")
        print(chunk)