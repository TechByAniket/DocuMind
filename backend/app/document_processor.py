# PyMuPDF is used to read and extract text from PDF files
import pymupdf 


# ====================================================
# Option 1: Extract text from a PDF file saved on disk
# ====================================================
def extract_text_from_pdf(file_path: str = "data/test.pdf") -> list[dict]:
    document = pymupdf.open(file_path)
    pages = []

    for page_number, page in enumerate(document):
        text = page.get_text()

        pages.append({
            "page_number": page_number + 1,
            "text": text.strip()
        })

    document.close()
    return pages


# ====================================================
# Option 2: Extract text from PDF bytes stored in memory
# ====================================================
def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> list[dict]:
    # Open the PDF directly from the byte data (in memory)
    with pymupdf.open(stream=pdf_bytes, filetype="pdf") as document:
        pages = []

        for page_number, page in enumerate(document):
            text = page.get_text()

            pages.append({
                "page_number": page_number + 1,
                "text": text.strip()
            })

    return pages


# Only run the code below if I directly execute this Python file.
if __name__ == "__main__":
    result = extract_text_from_pdf()
    print(f"Extracted {len(result)} pages.")
    for page in result:
        print(f"\n--- Page {page['page_number']} ---")
        print(page['text'])