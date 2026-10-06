# This imports PyMuPDF
# fitz gives us access to PDF processing functionality.
import pymupdf 


# ====================================================
# Get text from PDF/Document
# ====================================================

def extract_text_from_pdf(file_path = "data/test.pdf") -> list[dict]: # type hint
    # document represents the PDF
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

# Only run the code below if I directly execute this Python file.
if __name__ == "__main__":
    result = extract_text_from_pdf()
    print(f"Extracted {len(result)} pages.")
    for page in result:
        print(f"\n--- Page {page['page_number']} ---")
        print(page['text'])