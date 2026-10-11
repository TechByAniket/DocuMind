import os
import sys
import html
import shutil
from pathlib import Path

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

# Define custom Canvas for dynamic page numbers and running header/footer
class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            if self._pageNumber > 1:
                self.saveState()
                # Running Top Header
                self.setFont("Helvetica-Bold", 7.5)
                self.setFillColor(colors.HexColor("#334155"))
                self.drawString(40, 755, "DOCUMIND")
                self.setFont("Helvetica", 7.5)
                self.setFillColor(colors.HexColor("#64748B"))
                self.drawString(95, 755, "|  Comprehensive Architecture, Flow & Complete Codebase Guide")
                
                self.setStrokeColor(colors.HexColor("#CBD5E1"))
                self.setLineWidth(0.6)
                self.line(40, 747, 572, 747)
                
                # Running Bottom Footer
                self.setStrokeColor(colors.HexColor("#CBD5E1"))
                self.setLineWidth(0.6)
                self.line(40, 42, 572, 42)
                
                self.setFont("Helvetica", 7.5)
                self.setFillColor(colors.HexColor("#64748B"))
                self.drawString(40, 30, "DocuMind Document Intelligence Platform  •  Technical Blueprint")
                
                page_str = f"Page {self._pageNumber} of {num_pages}"
                self.drawRightString(572, 30, page_str)
                self.restoreState()
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)


def format_code_line(line: str) -> str:
    line = line.replace('\t', '    ')
    stripped = line.lstrip(' ')
    indent_count = len(line) - len(stripped)
    leading_spaces = '&nbsp;' * indent_count
    escaped_content = html.escape(stripped)
    if not line.strip():
        return '&nbsp;'
    return leading_spaces + escaped_content


def make_code_table(code_str: str, file_path_str: str, code_style, num_style, file_header_style):
    lines = code_str.splitlines()
    table_data = []
    
    # Header bar
    header_para = Paragraph(f"<b>SOURCE FILE:</b> {html.escape(file_path_str)} &nbsp;|&nbsp; <b>{len(lines)} lines</b>", file_header_style)
    table_data.append([Paragraph("", num_style), header_para])
    
    for i, line in enumerate(lines, start=1):
        formatted = format_code_line(line)
        num_para = Paragraph(f"{i:02d}", num_style)
        code_para = Paragraph(formatted, code_style)
        table_data.append([num_para, code_para])
        
    t = Table(table_data, colWidths=[26, 506], repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 4),
        ('TOPPADDING', (0, 0), (-1, 0), 4),
        ('LEFTPADDING', (0, 0), (-1, 0), 6),
        ('RIGHTPADDING', (0, 0), (-1, 0), 6),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor("#F8FAFC")),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor("#94A3B8")),
        ('INNERGRID', (0, 1), (-1, -1), 0.25, colors.HexColor("#F1F5F9")),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 1), (-1, -1), 1),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 1),
        ('LEFTPADDING', (0, 1), (0, -1), 2),
        ('RIGHTPADDING', (0, 1), (0, -1), 4),
        ('LEFTPADDING', (1, 1), (1, -1), 6),
        ('RIGHTPADDING', (1, 1), (1, -1), 4),
    ]))
    return t


def build_pdf(output_pdf_path: str):
    base_dir = Path("c:/Aniket-AI-Projects/documind")
    backend_dir = base_dir / "backend"
    
    # Read files
    def read_file_safe(rel_path: str) -> str:
        p = base_dir / rel_path
        if p.exists():
            return p.read_text(encoding="utf-8")
        return "# File not found: " + rel_path

    code_main = read_file_safe("backend/app/main.py")
    code_doc_service = read_file_safe("backend/app/document_service.py")
    code_doc_proc = read_file_safe("backend/app/document_processor.py")
    code_chunker = read_file_safe("backend/app/chunker.py")
    code_embed = read_file_safe("backend/app/embedding_service.py")
    code_vstore = read_file_safe("backend/app/qdrant/vector_store.py")
    code_qconn = read_file_safe("backend/app/qdrant/qdrant_connection.py")
    code_rag = read_file_safe("backend/app/rag_pipeline.py")
    code_llm = read_file_safe("backend/app/llm_service.py")
    code_schemas = read_file_safe("backend/app/schemas.py")
    code_models = read_file_safe("backend/app/database/models.py")
    code_database = read_file_safe("backend/app/database/database.py")
    code_create_tables = read_file_safe("backend/app/database/create_tables.py")
    code_env = read_file_safe("backend/.env")
    code_reqs = read_file_safe("backend/requirements.txt")

    # Document setup
    doc = SimpleDocTemplate(
        output_pdf_path,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#0F172A')
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=16,
        textColor=colors.HexColor('#3B82F6')
    )

    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1E3A8A'),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    h3_style = ParagraphStyle(
        'SectionH3',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=colors.HexColor('#0D9488'),
        spaceBefore=8,
        spaceAfter=3,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=6
    )

    body_bold = ParagraphStyle(
        'BodyBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=11.5,
        textColor=colors.HexColor('#1E293B')
    )

    file_header_style = ParagraphStyle(
        'FileHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#0F172A')
    )

    code_style = ParagraphStyle(
        'CodeText',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=6.8,
        leading=8.6,
        textColor=colors.HexColor('#0F172A')
    )

    num_style = ParagraphStyle(
        'LineNumText',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=6.8,
        leading=8.6,
        textColor=colors.HexColor('#94A3B8'),
        alignment=2
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.8,
        leading=10.5,
        textColor=colors.HexColor('#1E293B')
    )

    table_cell_code = ParagraphStyle(
        'TableCellCode',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor('#0F172A')
    )

    step_badge_style = ParagraphStyle(
        'StepBadge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#2563EB')
    )

    story = []

    # ==========================================
    # COVER / TITLE BLOCK
    # ==========================================
    story.append(Spacer(1, 10))
    # Badge
    badge_table = Table([[
        Paragraph("<font color='#2563EB'><b>SYSTEM ARCHITECTURE SPECIFICATION & CODEBASE CATALOG</b></font>", ParagraphStyle('Badge', fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=colors.HexColor('#2563EB')))
    ]], colWidths=[532])
    badge_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#EFF6FF')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#BFDBFE')),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(badge_table)
    story.append(Spacer(1, 12))

    story.append(Paragraph("DocuMind: Architecture & Code Reference", title_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph("End-to-End Flow Walkthrough, System Engineering Analysis & Verbatim Source Code Catalog", subtitle_style))
    story.append(Spacer(1, 10))

    # Meta card table
    meta_data = [
        [
            Paragraph("<b>Project:</b> DocuMind Document Intelligence", table_cell_style),
            Paragraph("<b>Architecture:</b> Micro-modular RAG (FastAPI + Qdrant + Gemini)", table_cell_style)
        ],
        [
            Paragraph("<b>Primary Database:</b> PostgreSQL 15+ (SQLAlchemy 2.0 ORM)", table_cell_style),
            Paragraph("<b>Vector Storage:</b> Qdrant Cloud (Cosine Metric / 768-dim Dense)", table_cell_style)
        ],
        [
            Paragraph("<b>AI Models:</b> Gemini Embedding 001 + Gemini 3.5 Flash Lite", table_cell_style),
            Paragraph("<b>Document Engine:</b> PyMuPDF (fitz) + Custom Sliding Window Chunker", table_cell_style)
        ],
        [
            Paragraph("<b>Runtime & Environment:</b> Python 3.13 / FastAPI / Uvicorn", table_cell_style),
            Paragraph("<b>Scope:</b> 100% Verbatim Code of All 15 Project Files", table_cell_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[266, 266])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 14))

    # Executive Overview Callout
    callout_data = [[
        Paragraph(
            "<b>Executive Overview:</b> DocuMind is a high-performance document question-answering platform built upon a Retrieval-Augmented Generation (RAG) architecture. "
            "It bridges relational database management (PostgreSQL) for metadata, state tracking, and auditing with managed vector indexing (Qdrant Cloud) for millisecond-latency semantic similarity search. "
            "This document presents the complete system architecture, step-by-step lifecycle flows (ingestion, vectorization, prompt synthesis, and generation), and the full source code of every project file.",
            callout_style
        )
    ]]
    callout_table = Table(callout_data, colWidths=[532])
    callout_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F0FDF4')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#86EFAC')),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(callout_table)
    story.append(Spacer(1, 14))

    # ==========================================
    # SECTION 1: HIGH-LEVEL ARCHITECTURE
    # ==========================================
    story.append(Paragraph("1. High-Level System Architecture & Technology Stack", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceBefore=2, spaceAfter=8))
    
    story.append(Paragraph(
        "DocuMind separates operational concerns into distinct tiers: an asynchronous HTTP API gateway (FastAPI), a persistent relational data layer (PostgreSQL), an AI semantic vector database (Qdrant Cloud), "
        "and Google Gemini foundation models orchestrated via LangChain. The diagram and matrix below summarize the core tiers:",
        body_style
    ))

    # Tech stack table
    tech_data = [
        [
            Paragraph("Layer / Subsystem", table_header_style),
            Paragraph("Technology", table_header_style),
            Paragraph("File / Module", table_header_style),
            Paragraph("Key Responsibilities & Architectural Role", table_header_style)
        ],
        [
            Paragraph("<b>API Gateway & Routes</b>", table_cell_style),
            Paragraph("FastAPI 0.142 + Uvicorn", table_cell_style),
            Paragraph("<code>app/main.py</code>", table_cell_code),
            Paragraph("Handles HTTP requests, streaming file uploads, request validation, and orchestrates services.", table_cell_style)
        ],
        [
            Paragraph("<b>Relational Persistence</b>", table_cell_style),
            Paragraph("PostgreSQL + SQLAlchemy 2.0", table_cell_style),
            Paragraph("<code>database/database.py<br/>database/models.py</code>", table_cell_code),
            Paragraph("Maintains document metadata, processing status (PROCESSING/READY/FAILED), page and chunk counts.", table_cell_style)
        ],
        [
            Paragraph("<b>Document Ingestion</b>", table_cell_style),
            Paragraph("PyMuPDF 1.28 (fitz)", table_cell_style),
            Paragraph("<code>app/document_processor.py</code>", table_cell_code),
            Paragraph("Extracts raw text per page with high fidelity while preserving page number references for citations.", table_cell_style)
        ],
        [
            Paragraph("<b>Linguistic Chunking</b>", table_cell_style),
            Paragraph("Sliding Window (1000/200)", table_cell_style),
            Paragraph("<code>app/chunker.py</code>", table_cell_code),
            Paragraph("Segments pages into overlapping text chunks to preserve cross-boundary semantics and paragraph continuity.", table_cell_style)
        ],
        [
            Paragraph("<b>Dense Embeddings</b>", table_cell_style),
            Paragraph("Google Gemini Embedding 001", table_cell_style),
            Paragraph("<code>app/embedding_service.py</code>", table_cell_code),
            Paragraph("Generates 768-dimensional dense vector embeddings via LangChain Google GenAI integration.", table_cell_style)
        ],
        [
            Paragraph("<b>Vector Storage & Search</b>", table_cell_style),
            Paragraph("Qdrant Cloud + LangChain", table_cell_style),
            Paragraph("<code>qdrant/vector_store.py<br/>qdrant/qdrant_connection.py</code>", table_cell_code),
            Paragraph("Stores high-dimensional vectors, chunk payloads, and executes Cosine Distance similarity searches.", table_cell_style)
        ],
        [
            Paragraph("<b>RAG Orchestration</b>", table_cell_style),
            Paragraph("Custom RAG Context Engine", table_cell_style),
            Paragraph("<code>app/rag_pipeline.py</code>", table_cell_code),
            Paragraph("Retrieves top-k chunks, compiles formatted context blocks, constructs grounded prompts with guardrails.", table_cell_style)
        ],
        [
            Paragraph("<b>Generative Reasoning</b>", table_cell_style),
            Paragraph("Google Gemini 3.5 Flash Lite", table_cell_style),
            Paragraph("<code>app/llm_service.py</code>", table_cell_code),
            Paragraph("Infers precise answers based strictly on retrieved context with temperature=0 to eliminate hallucinations.", table_cell_style)
        ],
    ]
    tech_table = Table(tech_data, colWidths=[100, 100, 110, 222])
    tech_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E293B')),
        ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor('#94A3B8')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')])
    ]))
    story.append(tech_table)
    story.append(Spacer(1, 14))

    # ==========================================
    # SECTION 2: END-TO-END FLOW-WISE PIPELINES
    # ==========================================
    story.append(PageBreak())
    story.append(Paragraph("2. End-to-End Execution Flows: Step-by-Step", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceBefore=2, spaceAfter=8))
    
    story.append(Paragraph(
        "To understand DocuMind comprehensively, the system must be examined through its execution lifecycles. "
        "Below are the complete, step-by-step flows explaining what code executes, in which file, and what data transitions occur.",
        body_style
    ))

    # ------------------------------------------
    # FLOW 1: DOCUMENT INGESTION
    # ------------------------------------------
    story.append(Paragraph("Flow 1: Document Upload & Ingestion Pipeline (Step-by-Step)", h2_style))
    story.append(Paragraph(
        "When a user uploads a PDF file (e.g. <code>POST /api/documents/upload</code>), the system executes a resilient, multi-stage ingestion sequence:",
        body_style
    ))

    ingest_steps = [
        [
            Paragraph("<b>Stage & Responsible File</b>", table_header_style),
            Paragraph("<b>What Happens (Execution Details & Data Transformation)</b>", table_header_style),
        ],
        [
            Paragraph("<b>Step 1: Upload Intake & Validation</b><br/><code>app/main.py</code><br/><i>Lines 31-45</i>", table_cell_style),
            Paragraph(
                "• Client transmits multipart/form-data containing the PDF.<br/>"
                "• FastAPI verifies file existence and validates file extension (must be <code>.pdf</code>).<br/>"
                "• An isolated ephemeral file path <code>uploads/{uuid4()}.pdf</code> is generated.<br/>"
                "• File content is streamed to disk in 1 MB chunks to prevent RAM spikes on large documents.",
                table_cell_style
            )
        ],
        [
            Paragraph("<b>Step 2: Service Delegation & Initial State</b><br/><code>app/document_service.py</code><br/><i>Lines 11-25</i>", table_cell_style),
            Paragraph(
                "• <code>ingest_document(file_path, filename, user_id)</code> is invoked.<br/>"
                "• Generates unique <code>document_id = uuid.uuid4()</code>.<br/>"
                "• Opens PostgreSQL session via <code>SessionLocal()</code>.<br/>"
                "• Inserts a new <code>Document</code> record with initial status <code>'PROCESSING'</code> and commits.",
                table_cell_style
            )
        ],
        [
            Paragraph("<b>Step 3: Text & Page Extraction</b><br/><code>app/document_processor.py</code><br/><i>Lines 10-24</i>", table_cell_style),
            Paragraph(
                "• <code>extract_text_from_pdf(file_path)</code> opens PDF using PyMuPDF (<code>fitz.open()</code>).<br/>"
                "• Iterates through document pages, extracting raw text with <code>page.get_text()</code>.<br/>"
                "• Strips extraneous whitespace and tracks 1-indexed page numbers.<br/>"
                "• Closes file handle safely and returns <code>pages = [{'page_number': 1, 'text': '...'}, ...]</code>.",
                table_cell_style
            )
        ],
        [
            Paragraph("<b>Step 4: Sliding-Window Chunking</b><br/><code>app/chunker.py</code><br/><i>Lines 5-32</i>", table_cell_style),
            Paragraph(
                "• <code>chunk_pages(pages, chunk_size=1000, overlap=200)</code> processes each page.<br/>"
                "• Applies a sliding window: takes 1000 characters, advances pointer by 800 (1000 - 200).<br/>"
                "• Preserves 200 characters of overlap to avoid cutting sentences or losing contextual continuity.<br/>"
                "• Associates each chunk with its originating <code>page_number</code> for citation traceability.",
                table_cell_style
            )
        ],
        [
            Paragraph("<b>Step 5: Dense Vector Embedding & Qdrant Upsert</b><br/><code>app/qdrant/vector_store.py</code><br/><code>app/embedding_service.py</code>", table_cell_style),
            Paragraph(
                "• <code>document_service.py</code> collects chunk texts and constructs rich metadata dictionaries:<br/>"
                "  <code>{'user_id': user_id, 'document_id': str(document_id), 'page_number': chunk['page_number']}</code>.<br/>"
                "• Calls <code>vector_store.add_texts(texts=texts, metadatas=metadatas)</code>.<br/>"
                "• LangChain invokes Google Gemini (<code>models/gemini-embedding-001</code>) to convert texts into 768-dim vectors.<br/>"
                "• Vectors and metadata payloads are indexed in Qdrant Cloud collection <code>documind_documents</code>.",
                table_cell_style
            )
        ],
        [
            Paragraph("<b>Step 6: Relational Metadata & Status Finalization</b><br/><code>app/document_service.py</code><br/><i>Lines 51-59</i>", table_cell_style),
            Paragraph(
                "• Re-opens PostgreSQL session and fetches <code>Document</code> record by ID.<br/>"
                "• Sets <code>page_count = len(pages)</code>, <code>chunk_count = len(chunks)</code>, and status <code>'READY'</code>.<br/>"
                "• Commits transaction. Returns <code>document_id</code> string back to API controller.",
                table_cell_style
            )
        ],
        [
            Paragraph("<b>Step 7: Disk Cleanup & HTTP 200 Dispatch</b><br/><code>app/main.py</code><br/><i>Lines 51-68</i>", table_cell_style),
            Paragraph(
                "• Returns JSON: <code>{'message': 'Document uploaded successfully', 'document_id': '...', 'status': 'READY'}</code>.<br/>"
                "• <b>Guaranteed Cleanup:</b> The <code>finally:</code> block unconditionally unlinks the temporary file on disk and closes the upload buffer.",
                table_cell_style
            )
        ],
        [
            Paragraph("<b>Exception Handling & Fault Isolation</b><br/><code>app/document_service.py</code><br/><i>Lines 61-69</i>", table_cell_style),
            Paragraph(
                "• If parsing, embedding, or Qdrant fails, the <code>except</code> block catches the exception.<br/>"
                "• Updates PostgreSQL document status to <code>'FAILED'</code> and re-raises.<br/>"
                "• <code>main.py</code> returns HTTP 500: <code>{'detail': 'Document processing failed.'}</code>.",
                table_cell_style
            )
        ],
    ]
    ingest_table = Table(ingest_steps, colWidths=[150, 382])
    ingest_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E3A8A')),
        ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor('#94A3B8')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')])
    ]))
    story.append(ingest_table)
    story.append(Spacer(1, 14))

    # ------------------------------------------
    # FLOW 2: DOCUMENT CHAT & RAG
    # ------------------------------------------
    story.append(Paragraph("Flow 2: Document Chat & RAG Retrieval Pipeline (Step-by-Step)", h2_style))
    story.append(Paragraph(
        "When a user submits a query to <code>POST /api/chat</code> (e.g. <i>'What is used for chat interfaces?'</i>), the end-to-end RAG pipeline executes:",
        body_style
    ))

    rag_steps = [
        [
            Paragraph("<b>Stage & Responsible File</b>", table_header_style),
            Paragraph("<b>What Happens (Execution Details & Data Transformation)</b>", table_header_style),
        ],
        [
            Paragraph("<b>Step 1: Request Intake & Schema Validation</b><br/><code>app/main.py</code> & <code>app/schemas.py</code>", table_cell_style),
            Paragraph(
                "• User sends JSON payload: <code>{'question': '...'}</code>.<br/>"
                "• FastAPI deserializes payload into Pydantic model <code>ChatRequest</code>.<br/>"
                "• Validates data type and delegates to <code>answer_question(request.question)</code>.",
                table_cell_style
            )
        ],
        [
            Paragraph("<b>Step 2: Semantic Vector Similarity Search</b><br/><code>app/rag_pipeline.py</code> & <code>app/qdrant/vector_store.py</code>", table_cell_style),
            Paragraph(
                "• <code>vector_store.similarity_search(question, k=3)</code> is called.<br/>"
                "• LangChain converts the user query into a 768-dim dense embedding using Gemini Embeddings.<br/>"
                "• Qdrant Cloud compares question vector against all indexed chunk vectors using Cosine Distance.<br/>"
                "• Returns top $k=3$ most semantically relevant document chunks with their metadata payloads.",
                table_cell_style
            )
        ],
        [
            Paragraph("<b>Step 3: Context Compilation & Source Attribution</b><br/><code>app/rag_pipeline.py</code><br/><i>Lines 12-28</i>", table_cell_style),
            Paragraph(
                "• Extracts <code>page_number</code> and <code>document_id</code> from each result's metadata.<br/>"
                "• Builds contextual text blocks labeled with page markers: <code>[Page 1]\\n...</code>.<br/>"
                "• Joins all chunk text blocks into a unified context string.<br/>"
                "• Collects source citations: <code>[{'page_number': 1, 'document_id': '...'}]</code>.",
                table_cell_style
            )
        ],
        [
            Paragraph("<b>Step 4: Anti-Hallucination Prompt Synthesis</b><br/><code>app/rag_pipeline.py</code><br/><i>Lines 29-45</i>", table_cell_style),
            Paragraph(
                "• Formulates a strict, closed-domain system prompt:<br/>"
                "  <i>'You are a document question-answering assistant. Answer the user's question using only the provided context. "
                "If the answer cannot be found in the context, say: \"I couldn't find the answer in the provided document.\"'</i><br/>"
                "• Injects retrieved context and the user's question into the prompt template.",
                table_cell_style
            )
        ],
        [
            Paragraph("<b>Step 5: LLM Reasoning & Generation</b><br/><code>app/llm_service.py</code><br/><i>Lines 10-25</i>", table_cell_style),
            Paragraph(
                "• Invokes Google Gemini 3.5 Flash Lite (<code>gemini-3.5-flash-lite</code>) via LangChain.<br/>"
                "• <code>temperature = 0</code> ensures deterministic, factual output based strictly on the injected context.<br/>"
                "• <code>generate_answer(prompt)</code> handles response parsing (supporting both string and content block formats).<br/>"
                "• Returns generated answer string.",
                table_cell_style
            )
        ],
        [
            Paragraph("<b>Step 6: Client Delivery with Citations</b><br/><code>app/main.py</code><br/><i>Line 28</i>", table_cell_style),
            Paragraph(
                "• Assembles structured JSON response:<br/>"
                "  <code>{'answer': '...', 'sources': [{'page_number': 1, 'document_id': '...'}]}</code>.<br/>"
                "• Client receives grounded answer along with exact page-level citations for verification.",
                table_cell_style
            )
        ],
    ]
    rag_table = Table(rag_steps, colWidths=[150, 382])
    rag_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0D9488')),
        ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor('#94A3B8')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')])
    ]))
    story.append(rag_table)
    story.append(Spacer(1, 14))

    # ------------------------------------------
    # FLOW 3: DOCUMENT MANAGEMENT FLOW
    # ------------------------------------------
    story.append(Paragraph("Flow 3: Document Catalog & Listing Pipeline", h2_style))
    story.append(Paragraph(
        "When a client requests the document repository via <code>GET /api/documents</code>, the system queries the relational store directly:",
        body_style
    ))
    doc_list_steps = [
        [
            Paragraph("<b>Stage & Responsible File</b>", table_header_style),
            Paragraph("<b>What Happens (Execution Details & Data Transformation)</b>", table_header_style),
        ],
        [
            Paragraph("<b>Step 1: Session Acquisition</b><br/><code>app/main.py</code> & <code>database/database.py</code>", table_cell_style),
            Paragraph("• A managed database session is checked out from the connection pool using context manager <code>with SessionLocal() as db:</code>.", table_cell_style)
        ],
        [
            Paragraph("<b>Step 2: Tenant Query & Ordering</b><br/><code>app/database/models.py</code>", table_cell_style),
            Paragraph("• Executes <code>db.query(Document).filter(Document.user_id == 'test-user').order_by(Document.created_at.desc()).all()</code>.<br/>"
                      "• Fast filtered query leveraging the indexed <code>user_id</code> column.", table_cell_style)
        ],
        [
            Paragraph("<b>Step 3: DTO Serialization</b><br/><code>app/main.py</code>", table_cell_style),
            Paragraph("• Serializes ORM records into JSON containing <code>document_id</code>, <code>filename</code>, <code>status</code>, <code>page_count</code>, <code>chunk_count</code>, and ISO 8601 formatted timestamp.", table_cell_style)
        ],
    ]
    doc_list_table = Table(doc_list_steps, colWidths=[150, 382])
    doc_list_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#475569')),
        ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor('#94A3B8')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')])
    ]))
    story.append(doc_list_table)
    story.append(Spacer(1, 14))

    # ==========================================
    # SECTION 3: COMPLETE VERBATIM CODEBASE REFERENCE
    # ==========================================
    story.append(PageBreak())
    story.append(Paragraph("3. Complete File-by-File Technical Breakdown & Full Source Code", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceBefore=2, spaceAfter=8))
    story.append(Paragraph(
        "This section documents <b>every single file in the DocuMind project</b>, ordered in execution flow sequence. "
        "Each file includes an in-depth architectural explanation followed by its <b>100% complete, verbatim source code</b>.",
        body_style
    ))
    story.append(Spacer(1, 8))

    # List of files in flow order with detailed metadata
    files_catalog = [
        {
            "num": "3.1",
            "name": "app/main.py",
            "rel_path": "backend/app/main.py",
            "role": "FastAPI Application Server & API Routes",
            "code": code_main,
            "explanation": (
                "<b>File Purpose & Architectural Role:</b><br/>"
                "<code>app/main.py</code> serves as the primary HTTP entry point and API controller for DocuMind. Built on FastAPI, it exposes the public REST API endpoints, manages CORS/request lifecycle, orchestrates streaming file uploads, and coordinates between the relational database, document ingestion engine, and RAG query pipeline.<br/><br/>"
                "<b>Key Functions & Architectural Decisions:</b><br/>"
                "• <b><code>home()</code> (GET /):</b> Health check and welcoming probe endpoint.<br/>"
                "• <b><code>upload_document()</code> (POST /api/documents/upload):</b> Validates file type (must be .pdf), generates a secure UUID4 filename, stages the upload to the <code>uploads/</code> directory using chunked streaming (1 MB buffers) to prevent memory saturation, calls <code>ingest_document()</code>, and cleans up the temporary file on disk inside a strict <code>finally:</code> block.<br/>"
                "• <b><code>chat()</code> (POST /api/chat):</b> Consumes a validated <code>ChatRequest</code> payload containing the user's question, delegates to <code>answer_question()</code> in the RAG pipeline, and returns the grounded answer along with exact source citations.<br/>"
                "• <b><code>list_documents()</code> (GET /api/documents):</b> Establishes a database session with <code>SessionLocal()</code>, queries all documents for the current user ordered by creation timestamp descending, and serializes document metadata (UUID, filename, processing status, page count, chunk count, timestamp)."
            )
        },
        {
            "num": "3.2",
            "name": "app/document_service.py",
            "rel_path": "backend/app/document_service.py",
            "role": "Document Ingestion Business Logic & State Coordinator",
            "code": code_doc_service,
            "explanation": (
                "<b>File Purpose & Architectural Role:</b><br/>"
                "<code>app/document_service.py</code> contains the core business logic for document ingestion and lifecycle management. It acts as the transaction coordinator, ensuring that documents move through relational database tracking (PostgreSQL), text extraction (PyMuPDF), chunking (Sliding Window), vector embedding (Gemini), and vector indexing (Qdrant) atomically and reliably.<br/><br/>"
                "<b>Key Functions & Architectural Decisions:</b><br/>"
                "• <b><code>ingest_document(file_path, filename, user_id) -> str:</code></b><br/>"
                "  1. <i>Initial State Tracking:</i> Creates a new <code>Document</code> record with UUID primary key in PostgreSQL with status <code>'PROCESSING'</code>.<br/>"
                "  2. <i>Extraction:</i> Delegates to <code>extract_text_from_pdf()</code> to parse all pages.<br/>"
                "  3. <i>Chunking:</i> Calls <code>chunk_pages()</code> with character-level windowing and overlap.<br/>"
                "  4. <i>Vector Upsert:</i> Extracts chunk texts and builds metadata dictionaries (user ID, document ID, page number), then indexes them into Qdrant Cloud via <code>vector_store.add_texts()</code>.<br/>"
                "  5. <i>State Finalization:</i> Updates the PostgreSQL record with final page count, chunk count, and marks status as <code>'READY'</code>.<br/>"
                "  6. <i>Fault Isolation:</i> Catches any unexpected failure during ingestion, immediately updates the document status to <code>'FAILED'</code> in PostgreSQL, and re-raises the error."
            )
        },
        {
            "num": "3.3",
            "name": "app/document_processor.py",
            "rel_path": "backend/app/document_processor.py",
            "role": "Document Extraction Engine (PyMuPDF / fitz)",
            "code": code_doc_proc,
            "explanation": (
                "<b>File Purpose & Architectural Role:</b><br/>"
                "<code>app/document_processor.py</code> is responsible for extracting raw textual content from uploaded PDF documents with high fidelity and page awareness using the high-performance PyMuPDF library (<code>pymupdf</code> / <code>fitz</code>).<br/><br/>"
                "<b>Key Functions & Architectural Decisions:</b><br/>"
                "• <b><code>extract_text_from_pdf(file_path) -> list[dict]:</code></b> Opens the PDF file via <code>pymupdf.open(file_path)</code>, iterates over each page using <code>enumerate(document)</code>, extracts the text using <code>page.get_text()</code>, strips extraneous leading/trailing whitespace, and appends a structured record: <code>{'page_number': page_number + 1, 'text': text.strip()}</code>.<br/>"
                "• <b>Resource Management:</b> Closes the document via <code>document.close()</code> to guarantee that OS file handles and memory locks are released immediately.<br/>"
                "• <b>Self-contained Test Harness:</b> Includes an executable <code>if __name__ == '__main__':</code> block that extracts and prints pages from <code>data/test.pdf</code> for rapid standalone unit testing."
            )
        },
        {
            "num": "3.4",
            "name": "app/chunker.py",
            "rel_path": "backend/app/chunker.py",
            "role": "Linguistic Segmentation & Sliding Window Chunker",
            "code": code_chunker,
            "explanation": (
                "<b>File Purpose & Architectural Role:</b><br/>"
                "<code>app/chunker.py</code> breaks long-form page text into semantically cohesive, overlapping text chunks optimized for dense vector embedding and LLM context window ingestion.<br/><br/>"
                "<b>Key Functions & Architectural Decisions:</b><br/>"
                "• <b><code>chunk_pages(pages, chunk_size=1000, overlap=200) -> list[dict]:</code></b> Iterates over each page extracted by <code>document_processor.py</code>, maintains a sliding character window starting at index 0, extracts a slice of length <code>chunk_size</code> (default 1000 chars), and steps forward by <code>chunk_size - overlap</code> (default 800 chars).<br/>"
                "• <b>Context Continuity:</b> The 200-character overlap ensures that sentences or paragraphs that span across slice boundaries are not truncated abruptly, preserving semantic context across chunk edges.<br/>"
                "• <b>Source Tracking:</b> Every chunk maintains its parent <code>page_number</code>, allowing downstream RAG queries to provide exact page-level citations back to the user."
            )
        },
        {
            "num": "3.5",
            "name": "app/embedding_service.py",
            "rel_path": "backend/app/embedding_service.py",
            "role": "Semantic Dense Vectorization Engine (Google Gemini)",
            "code": code_embed,
            "explanation": (
                "<b>File Purpose & Architectural Role:</b><br/>"
                "<code>app/embedding_service.py</code> initializes and provides the dense vector embedding model used across the entire platform. It integrates Google's state-of-the-art embedding foundation model via LangChain's Google GenAI integration.<br/><br/>"
                "<b>Key Functions & Architectural Decisions:</b><br/>"
                "• <b><code>GoogleGenerativeAIEmbeddings:</code></b> Configured with model <code>models/gemini-embedding-001</code> and the API key retrieved securely from <code>GEMINI_API_KEY</code> environment variable.<br/>"
                "• <b><code>generate_embedding(text) -> list[float]:</code></b> A utility function that accepts raw text strings and calls <code>embeddings.embed_query(text)</code> to produce high-dimensional dense vector representations.<br/>"
                "• <b>Mathematical Validation:</b> Includes a verification harness comparing two semantically related networking sentences using NumPy cosine similarity (<code>np.dot(v1, v2) / (norm(v1) * norm(v2))</code>) to validate dimensional fidelity and semantic distance."
            )
        },
        {
            "num": "3.6",
            "name": "app/qdrant/vector_store.py",
            "rel_path": "backend/app/qdrant/vector_store.py",
            "role": "LangChain Qdrant Cloud Vector Store Integration",
            "code": code_vstore,
            "explanation": (
                "<b>File Purpose & Architectural Role:</b><br/>"
                "<code>app/qdrant/vector_store.py</code> bridges the LangChain vector store abstraction with our remote Qdrant Cloud cluster. It manages the collection mapping, embedding linkage, and similarity search operations.<br/><br/>"
                "<b>Key Functions & Architectural Decisions:</b><br/>"
                "• <b><code>QdrantClient:</code></b> Instantiated with <code>url=QDRANT_URL</code>, <code>api_key=QDRANT_API_KEY</code>, and an explicit 60-second network timeout to handle cloud network latency.<br/>"
                "• <b><code>QdrantVectorStore:</code></b> Binds the client to the <code>documind_documents</code> collection, attaches the Gemini embedding instance from <code>app/embedding_service.py</code>, and specifies the vector name as <code>'dense'</code>.<br/>"
                "• <b><code>similarity_search(query, k):</code></b> Performs high-speed Cosine Distance nearest-neighbor search, returning top-k matching document chunks along with their associated metadata payloads."
            )
        },
        {
            "num": "3.7",
            "name": "app/qdrant/qdrant_connection.py",
            "rel_path": "backend/app/qdrant/qdrant_connection.py",
            "role": "Direct Qdrant Cloud Connection Client & Health Check",
            "code": code_qconn,
            "explanation": (
                "<b>File Purpose & Architectural Role:</b><br/>"
                "<code>app/qdrant/qdrant_connection.py</code> provides a direct, low-level Python client connection to Qdrant Cloud using the official <code>qdrant-client</code> SDK. It serves as an administrative probe and direct cluster interaction interface.<br/><br/>"
                "<b>Key Functions & Architectural Decisions:</b><br/>"
                "• <b><code>QdrantClient:</code></b> Loads credentials from <code>.env</code> and instantiates the direct SDK client.<br/>"
                "• <b>Connectivity Validation:</b> In standalone mode, queries <code>client.get_collections()</code> to verify API key validity, cluster network reachability, and active collection counts on Qdrant Cloud."
            )
        },
        {
            "num": "3.8",
            "name": "app/rag_pipeline.py",
            "rel_path": "backend/app/rag_pipeline.py",
            "role": "Retrieval-Augmented Generation Orchestrator",
            "code": code_rag,
            "explanation": (
                "<b>File Purpose & Architectural Role:</b><br/>"
                "<code>app/rag_pipeline.py</code> coordinates the complete retrieval-augmented generation workflow. It handles semantic search retrieval, context synthesis, anti-hallucination prompt construction, LLM generation, and source attribution mapping.<br/><br/>"
                "<b>Key Functions & Architectural Decisions:</b><br/>"
                "• <b><code>answer_question(question: str) -> dict:</code></b><br/>"
                "  1. <i>Similarity Retrieval:</i> Calls <code>vector_store.similarity_search(question, k=3)</code> to retrieve the top 3 most relevant context chunks.<br/>"
                "  2. <i>Context Aggregation:</i> Formats each chunk with page attribution headers (e.g. <code>[Page 1]\\n{chunk_text}</code>) and tracks source metadata (page number and document ID).<br/>"
                "  3. <i>Strict Guardrail Prompting:</i> Formulates an explicit system prompt directing the LLM to answer using <i>only</i> the provided context and strictly return <code>\"I couldn't find the answer in the provided document.\"</code> if the context lacks the answer.<br/>"
                "  4. <i>Inference:</i> Invokes <code>generate_answer()</code> from <code>llm_service.py</code>.<br/>"
                "  5. <i>Attribution Return:</i> Returns a dictionary containing the generated <code>answer</code> and the list of verified <code>sources</code>."
            )
        },
        {
            "num": "3.9",
            "name": "app/llm_service.py",
            "rel_path": "backend/app/llm_service.py",
            "role": "Foundation Model Reasoning Service (Gemini 3.5 Flash Lite)",
            "code": code_llm,
            "explanation": (
                "<b>File Purpose & Architectural Role:</b><br/>"
                "<code>app/llm_service.py</code> encapsulates the Large Language Model interface. It instantiates Google's state-of-the-art Gemini 3.5 Flash Lite model configured for zero-hallucination factual synthesis.<br/><br/>"
                "<b>Key Functions & Architectural Decisions:</b><br/>"
                "• <b><code>ChatGoogleGenerativeAI:</code></b> Configured with model <code>gemini-3.5-flash-lite</code>, API key from <code>GEMINI_API_KEY</code>, and <code>temperature=0</code> to eliminate randomness and guarantee reproducible, factual generation.<br/>"
                "• <b><code>generate_answer(prompt: str) -> str:</code></b> Executes <code>llm.invoke(prompt)</code> and includes robust multi-block content handling (if the response content is returned as a list of content blocks, it safely extracts the text of the primary block; otherwise, it returns the text string directly)."
            )
        },
        {
            "num": "3.10",
            "name": "app/schemas.py",
            "rel_path": "backend/app/schemas.py",
            "role": "Pydantic Request & Response Data Contracts",
            "code": code_schemas,
            "explanation": (
                "<b>File Purpose & Architectural Role:</b><br/>"
                "<code>app/schemas.py</code> defines the Pydantic data models used for strict request body parsing, automated type coercion, and OpenAPI/Swagger documentation generation in FastAPI.<br/><br/>"
                "<b>Key Models:</b><br/>"
                "• <b><code>ChatRequest(BaseModel):</code></b> Defines the request contract for the <code>/api/chat</code> endpoint. Enforces that incoming payloads contain a non-null string field <code>question</code>, returning HTTP 422 Unprocessable Entity automatically if invalid data is provided."
            )
        },
        {
            "num": "3.11",
            "name": "app/database/models.py",
            "rel_path": "backend/app/database/models.py",
            "role": "SQLAlchemy 2.0 Relational Entity Models",
            "code": code_models,
            "explanation": (
                "<b>File Purpose & Architectural Role:</b><br/>"
                "<code>app/database/models.py</code> defines the relational database schema using modern SQLAlchemy 2.0 type-annotated <code>DeclarativeBase</code> and <code>Mapped</code> columns.<br/><br/>"
                "<b>Schema Definition (<code>documents</code> table):</b><br/>"
                "• <b><code>id:</code></b> UUID primary key with native <code>uuid.uuid4</code> default.<br/>"
                "• <b><code>user_id:</code></b> String, non-nullable, with a B-Tree index for rapid tenant-isolated queries.<br/>"
                "• <b><code>filename:</code></b> Original file name string.<br/>"
                "• <b><code>status:</code></b> Processing lifecycle status (<code>'PROCESSING'</code>, <code>'READY'</code>, <code>'FAILED'</code>).<br/>"
                "• <b><code>page_count:</code></b> Total pages extracted from the PDF.<br/>"
                "• <b><code>chunk_count:</code></b> Total sliding-window text chunks created and indexed in Qdrant.<br/>"
                "• <b><code>created_at:</code></b> Timezone-aware timestamp defaulting to PostgreSQL server time (<code>func.now()</code>)."
            )
        },
        {
            "num": "3.12",
            "name": "app/database/database.py",
            "rel_path": "backend/app/database/database.py",
            "role": "SQLAlchemy Engine, Connection Pool & Session Maker",
            "code": code_database,
            "explanation": (
                "<b>File Purpose & Architectural Role:</b><br/>"
                "<code>app/database/database.py</code> configures the persistent database connection engine and thread-safe session factory for PostgreSQL.<br/><br/>"
                "<b>Key Functions & Architectural Decisions:</b><br/>"
                "• <b><code>create_engine:</code></b> Initializes PostgreSQL engine using <code>DATABASE_URL</code> with <code>pool_pre_ping=True</code>. Pre-ping checks verify connection health before checkout, preventing stale connection errors after idle timeouts.<br/>"
                "• <b><code>SessionLocal:</code></b> Session factory configured with <code>autoflush=False</code> and <code>autocommit=False</code> to ensure clean transactional boundaries.<br/>"
                "• <b>Connection Test Harness:</b> Executes <code>SELECT 1</code> in standalone execution to verify connectivity."
            )
        },
        {
            "num": "3.13",
            "name": "app/database/create_tables.py",
            "rel_path": "backend/app/database/create_tables.py",
            "role": "Database DDL Migration & Table Provisioning Script",
            "code": code_create_tables,
            "explanation": (
                "<b>File Purpose & Architectural Role:</b><br/>"
                "<code>app/database/create_tables.py</code> is the schema bootstrapping utility. When run, it binds SQLAlchemy metadata with the configured database engine and issues SQL DDL commands (<code>CREATE TABLE IF NOT EXISTS</code>) to provision all tables defined in <code>models.py</code>."
            )
        },
        {
            "num": "3.14",
            "name": ".env (Environment Configuration)",
            "rel_path": "backend/.env",
            "role": "Environment Variables & Secrets Architecture",
            "code": code_env,
            "explanation": (
                "<b>File Purpose & Architectural Role:</b><br/>"
                "<code>backend/.env</code> centralizes all infrastructure credentials and API keys required by DocuMind. The application loads these variables using <code>python-dotenv</code>.<br/><br/>"
                "<b>Configuration Keys:</b><br/>"
                "• <b><code>DATABASE_URL:</code></b> PostgreSQL connection string formatted as <code>postgresql+psycopg://username:password@host:port/database</code>.<br/>"
                "• <b><code>GEMINI_API_KEY:</code></b> Google AI Studio API key enabling Gemini embeddings and Gemini 3.5 Flash Lite chat completions.<br/>"
                "• <b><code>QDRANT_URL:</code></b> HTTPS endpoint pointing to the managed Qdrant Cloud cluster.<br/>"
                "• <b><code>QDRANT_API_KEY:</code></b> Secure API key for authenticating vector upserts and similarity queries."
            )
        },
        {
            "num": "3.15",
            "name": "requirements.txt",
            "rel_path": "backend/requirements.txt",
            "role": "Complete Dependency Manifest & Runtime Packages",
            "code": code_reqs,
            "explanation": (
                "<b>File Purpose & Architectural Role:</b><br/>"
                "<code>backend/requirements.txt</code> specifies the exact pinned package versions forming DocuMind's runtime environment. Core library categories include:<br/>"
                "• <b>Web & Async:</b> <code>fastapi</code>, <code>uvicorn</code>, <code>starlette</code>, <code>pydantic</code>, <code>python-multipart</code>.<br/>"
                "• <b>Database & ORM:</b> <code>SQLAlchemy</code>, <code>psycopg</code>, <code>psycopg-binary</code>.<br/>"
                "• <b>Document Processing:</b> <code>pymupdf</code> (fitz).<br/>"
                "• <b>Vector Database:</b> <code>qdrant-client</code>, <code>langchain-qdrant</code>.<br/>"
                "• <b>AI & Embeddings:</b> <code>langchain</code>, <code>langchain-google-genai</code>, <code>google-genai</code>, <code>numpy</code>."
            )
        },
    ]

    for item in files_catalog:
        story.append(Paragraph(f"{item['num']} {item['name']}", h2_style))
        story.append(Paragraph(f"<b>Architectural Role:</b> {item['role']}", h3_style))
        story.append(Paragraph(item['explanation'], body_style))
        story.append(Spacer(1, 4))
        
        # Add code table
        code_table = make_code_table(
            code_str=item['code'],
            file_path_str=item['rel_path'],
            code_style=code_style,
            num_style=num_style,
            file_header_style=file_header_style
        )
        story.append(code_table)
        story.append(Spacer(1, 14))

    # ==========================================
    # SECTION 4: DATA SCHEMAS & API CONTRACTS
    # ==========================================
    story.append(PageBreak())
    story.append(Paragraph("4. Data Schemas, Storage Models & API Contracts", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceBefore=2, spaceAfter=8))
    
    story.append(Paragraph(
        "DocuMind enforces strict structural schemas across both storage systems and HTTP interfaces. Below are the definitive schema definitions:",
        body_style
    ))

    # PostgreSQL schema table
    story.append(Paragraph("PostgreSQL Relational Schema: <code>documents</code> Table", h2_style))
    db_schema_data = [
        [
            Paragraph("Column Name", table_header_style),
            Paragraph("SQL Type", table_header_style),
            Paragraph("Constraints & Indexing", table_header_style),
            Paragraph("Description & Semantic Meaning", table_header_style)
        ],
        [
            Paragraph("<code>id</code>", table_cell_code),
            Paragraph("UUID", table_cell_style),
            Paragraph("PRIMARY KEY, NOT NULL", table_cell_style),
            Paragraph("Unique document identifier generated via <code>uuid.uuid4()</code>.", table_cell_style)
        ],
        [
            Paragraph("<code>user_id</code>", table_cell_code),
            Paragraph("VARCHAR / TEXT", table_cell_style),
            Paragraph("INDEXED, NOT NULL", table_cell_style),
            Paragraph("Tenant / owner identifier for multi-user document isolation.", table_cell_style)
        ],
        [
            Paragraph("<code>filename</code>", table_cell_code),
            Paragraph("VARCHAR / TEXT", table_cell_style),
            Paragraph("NOT NULL", table_cell_style),
            Paragraph("Original filename submitted by user during upload.", table_cell_style)
        ],
        [
            Paragraph("<code>status</code>", table_cell_code),
            Paragraph("VARCHAR / TEXT", table_cell_style),
            Paragraph("DEFAULT 'PROCESSING', NOT NULL", table_cell_style),
            Paragraph("State machine flag: <code>'PROCESSING'</code>, <code>'READY'</code>, or <code>'FAILED'</code>.", table_cell_style)
        ],
        [
            Paragraph("<code>page_count</code>", table_cell_code),
            Paragraph("INTEGER", table_cell_style),
            Paragraph("DEFAULT 0, NOT NULL", table_cell_style),
            Paragraph("Total number of pages parsed by PyMuPDF.", table_cell_style)
        ],
        [
            Paragraph("<code>chunk_count</code>", table_cell_code),
            Paragraph("INTEGER", table_cell_style),
            Paragraph("DEFAULT 0, NOT NULL", table_cell_style),
            Paragraph("Total sliding-window chunks indexed into Qdrant Cloud.", table_cell_style)
        ],
        [
            Paragraph("<code>created_at</code>", table_cell_code),
            Paragraph("TIMESTAMP WITH TIME ZONE", table_cell_style),
            Paragraph("SERVER DEFAULT now(), NOT NULL", table_cell_style),
            Paragraph("Timezone-aware record creation timestamp.", table_cell_style)
        ],
    ]
    db_table = Table(db_schema_data, colWidths=[90, 100, 140, 202])
    db_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E293B')),
        ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor('#94A3B8')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')])
    ]))
    story.append(db_table)
    story.append(Spacer(1, 14))

    # Qdrant Vector Collection Schema
    story.append(Paragraph("Qdrant Cloud Vector Collection: <code>documind_documents</code>", h2_style))
    vstore_schema_data = [
        [
            Paragraph("Parameter / Field", table_header_style),
            Paragraph("Specification / Type", table_header_style),
            Paragraph("Description & Purpose", table_header_style)
        ],
        [
            Paragraph("<b>Vector Name</b>", table_cell_style),
            Paragraph("<code>dense</code>", table_cell_code),
            Paragraph("Named vector configuration enabling future multi-vector / hybrid search expansion.", table_cell_style)
        ],
        [
            Paragraph("<b>Vector Dimensions</b>", table_cell_style),
            Paragraph("768 dimensions", table_cell_style),
            Paragraph("Output dimensionality produced by Google Gemini <code>models/gemini-embedding-001</code>.", table_cell_style)
        ],
        [
            Paragraph("<b>Distance Metric</b>", table_cell_style),
            Paragraph("Cosine Similarity", table_cell_style),
            Paragraph("Measures cosine angle between normalized dense query vectors and chunk vectors.", table_cell_style)
        ],
        [
            Paragraph("<b>Payload: <code>user_id</code></b>", table_cell_style),
            Paragraph("String (Payload Filter)", table_cell_style),
            Paragraph("Allows tenant filtering so queries only match chunks belonging to the requesting user.", table_cell_style)
        ],
        [
            Paragraph("<b>Payload: <code>document_id</code></b>", table_cell_style),
            Paragraph("String UUID (Payload Filter)", table_cell_style),
            Paragraph("Enables document-scoped queries (e.g. searching only within a specific document).", table_cell_style)
        ],
        [
            Paragraph("<b>Payload: <code>page_number</code></b>", table_cell_style),
            Paragraph("Integer (Metadata)", table_cell_style),
            Paragraph("Exact 1-indexed page number where the chunk originates, returned as citation source.", table_cell_style)
        ],
        [
            Paragraph("<b>Payload: <code>page_content</code></b>", table_cell_style),
            Paragraph("Text String (Content)", table_cell_style),
            Paragraph("Raw chunk text injected into the LLM context prompt during RAG retrieval.", table_cell_style)
        ],
    ]
    vstore_table = Table(vstore_schema_data, colWidths=[130, 130, 272])
    vstore_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F766E')),
        ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor('#94A3B8')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')])
    ]))
    story.append(vstore_table)
    story.append(Spacer(1, 14))

    # API Specification Matrix
    story.append(Paragraph("FastAPI Endpoints Reference Matrix", h2_style))
    api_spec_data = [
        [
            Paragraph("Endpoint & Method", table_header_style),
            Paragraph("Request Payload", table_header_style),
            Paragraph("Response Schema", table_header_style),
            Paragraph("Status Codes", table_header_style)
        ],
        [
            Paragraph("<code>GET /</code>", table_cell_code),
            Paragraph("None", table_cell_style),
            Paragraph("<code>{'message': 'Welcom to DocuMind...'}</code>", table_cell_code),
            Paragraph("200 OK", table_cell_style)
        ],
        [
            Paragraph("<code>POST /api/documents/upload</code>", table_cell_code),
            Paragraph("multipart/form-data<br/><code>file: UploadFile (.pdf)</code>", table_cell_style),
            Paragraph("<code>{'message': '...', 'document_id': 'uuid', 'filename': '...', 'status': 'READY'}</code>", table_cell_code),
            Paragraph("200 OK<br/>400 Bad Request<br/>500 Internal Error", table_cell_style)
        ],
        [
            Paragraph("<code>POST /api/chat</code>", table_cell_code),
            Paragraph("JSON (ChatRequest)<br/><code>{'question': '...'}</code>", table_cell_style),
            Paragraph("<code>{'answer': '...', 'sources': [{'page_number': 1, 'document_id': '...'}]}</code>", table_cell_code),
            Paragraph("200 OK<br/>422 Unprocessable", table_cell_style)
        ],
        [
            Paragraph("<code>GET /api/documents</code>", table_cell_code),
            Paragraph("None (query for 'test-user')", table_cell_style),
            Paragraph("<code>[{'document_id': '...', 'filename': '...', 'status': '...', 'page_count': N, 'chunk_count': M, 'created_at': '...'}]</code>", table_cell_code),
            Paragraph("200 OK", table_cell_style)
        ],
    ]
    api_table = Table(api_spec_data, colWidths=[130, 110, 212, 80])
    api_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E3A8A')),
        ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor('#94A3B8')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')])
    ]))
    story.append(api_table)
    story.append(Spacer(1, 14))

    # ==========================================
    # SECTION 5: ARCHITECTURAL SUMMARY & ROADMAP
    # ==========================================
    story.append(PageBreak())
    story.append(Paragraph("5. Architectural Summary, Design Patterns & Production Roadmap", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceBefore=2, spaceAfter=8))
    
    story.append(Paragraph(
        "<b>Core Software Engineering Design Patterns Implemented:</b><br/>"
        "• <b>Gateway Pattern (FastAPI):</b> Decouples external clients from internal services, encapsulating authentication, validation, and error translation.<br/>"
        "• <b>Repository & Active Record (SQLAlchemy 2.0):</b> Type-annotated ORM encapsulates relational state, enabling auditable transaction boundaries.<br/>"
        "• <b>Orchestrator Pattern (document_service & rag_pipeline):</b> Centralizes multi-stage business workflows while keeping constituent modules (chunker, processor, vector store, LLM) modular and independently testable.<br/>"
        "• <b>Fail-Safe Cleanup (Finally Guarantees):</b> Ephemeral disk storage is unconditionally unlinked in Python <code>finally:</code> blocks, preventing disk leaks.<br/>"
        "• <b>Anti-Hallucination Guardrails:</b> Closes LLM degrees of freedom by combining zero-temperature inference with strict negative prompt instructions.",
        body_style
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph(
        "<b>Production Roadmap & Recommended Next Steps:</b><br/>"
        "1. <b>Asynchronous Background Task Queue (Celery / Redis / RQ):</b> Move the ingestion pipeline to a background worker to avoid holding open the HTTP connection during large multi-page PDF processing.<br/>"
        "2. <b>Multi-Tenant JWT Authentication:</b> Replace the hardcoded <code>test-user</code> placeholder with OAuth2 / JWT authentication to isolate user documents securely.<br/>"
        "3. <b>Hybrid Search (Dense + Sparse BM25):</b> Complement dense Gemini embeddings with sparse keyword search in Qdrant for enhanced retrieval of technical acronyms, part numbers, and exact code symbols.<br/>"
        "4. <b>Semantic Reranking:</b> Introduce a cross-encoder reranking model (e.g., Cohere Rerank or BGE Reranker) between Qdrant retrieval and prompt synthesis to prioritize the most relevant chunks.<br/>"
        "5. <b>Modern Frontend Interface:</b> Implement a Next.js / React chat UI supporting drag-and-drop PDF uploads, active document selection, streaming LLM completions, and interactive source page viewer.",
        body_style
    ))
    story.append(Spacer(1, 14))

    # Sign-off box
    signoff_data = [[
        Paragraph(
            "<b>Document Verification:</b> This document represents the official and complete architectural specification of the DocuMind platform as of October 2026. "
            "All 15 source files have been cataloged verbatim with complete code listings, operational flow sequences, and system specifications.",
            callout_style
        )
    ]]
    signoff_table = Table(signoff_data, colWidths=[532])
    signoff_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(signoff_table)

    # Build the document
    print(f"Building PDF at: {output_pdf_path}...")
    doc.build(story, canvasmaker=NumberedCanvas)
    print("PDF build complete!")


if __name__ == "__main__":
    out_path = Path("c:/Aniket-AI-Projects/documind/DocuMind_Complete_Codebase_and_Architecture_Flow.pdf")
    build_pdf(str(out_path))
    
    # Also copy to backend directory for convenience
    backend_copy = Path("c:/Aniket-AI-Projects/documind/backend/DocuMind_Complete_Codebase_and_Architecture_Flow.pdf")
    shutil.copyfile(out_path, backend_copy)
    print(f"Copied to: {backend_copy}")
