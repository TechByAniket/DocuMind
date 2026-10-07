# =====================================
# Split text into chunks
# =====================================

def chunk_pages(
    pages: list[dict],
    chunk_size: int = 1000,
    overlap: int = 200
) -> list[dict]:

    chunks = []

    for page in pages:
        text = page["text"]
        page_number = page["page_number"]

        start = 0

        while start < len(text):
            end = start + chunk_size

            chunk = text[start:end]

            chunks.append({
                "text": chunk,
                "page_number": page_number
            })

            start = end - overlap

    return chunks



if __name__ == "__main__":
    from app.document_processor import extract_text_from_pdf

    pages = extract_text_from_pdf("data/test.pdf")

    chunks = chunk_pages(
        pages,
        chunk_size=1000,
        overlap=200
    )

    print(f"Created {len(chunks)} chunks.")

    for i, chunk in enumerate(chunks[:5]):
        print(f"\n--- Chunk {i + 1} ---")
        print(f"Page: {chunk['page_number']}")
        print(f"Length: {len(chunk['text'])}")
        print(chunk["text"])