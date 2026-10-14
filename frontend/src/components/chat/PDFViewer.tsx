import { useEffect, useRef, useState } from 'react';
import {
  FileText,
  Loader2,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';

import apiClient from '../../services/api';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface PDFViewerProps {
  documentId: string;
  pageNumber?: number;
  highlightPage?: number;
  highlightText?: string;
}

// ── Text-layer highlighting helpers ─────────────────────────────────────────

/** Normalize whitespace so chunk text and PDF span text can be compared. */
function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Walk all text-layer <span> elements on a rendered PDF page and wrap any
 * span whose text is contained in the target passage with a highlight element.
 * Returns the number of spans highlighted.
 */
function highlightSpans(pageEl: HTMLDivElement, targetText: string): number {
  clearHighlights(pageEl);

  if (!targetText.trim()) return 0;

  const normalTarget = normalize(targetText);
  const spans = pageEl.querySelectorAll<HTMLSpanElement>(
    '.react-pdf__Page__textContent span',
  );

  let count = 0;

  for (const span of spans) {
    const spanText = normalize(span.textContent ?? '');
    if (!spanText) continue;

    // Highlight if the span text appears in the chunk, or the chunk appears in the span.
    if (normalTarget.includes(spanText) || spanText.includes(normalTarget.slice(0, 60))) {
      span.dataset.pdfHighlighted = 'true';
      span.style.backgroundColor = 'rgba(34, 197, 94, 0.32)'; // emerald-500 at 32% opacity
      span.style.borderRadius = '3px';
      span.style.boxShadow = '0 0 0 2px rgba(34, 197, 94, 0.22)';
      span.style.transition = 'background-color 0.2s';
      count++;
    }
  }

  return count;
}

/** Remove all highlights set by highlightSpans. */
function clearHighlights(pageEl: HTMLDivElement) {
  const highlighted = pageEl.querySelectorAll<HTMLSpanElement>(
    '[data-pdf-highlighted="true"]',
  );
  for (const span of highlighted) {
    span.removeAttribute('data-pdf-highlighted');
    span.style.backgroundColor = '';
    span.style.borderRadius = '';
    span.style.boxShadow = '';
    span.style.transition = '';
  }
}

export default function PDFViewer({
  documentId,
  pageNumber = 1,
  highlightPage,
  highlightText,
}: PDFViewerProps) {
  const [pdfUrl, setPdfUrl] = useState('');
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [loadingUrl, setLoadingUrl] = useState(true);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [error, setError] = useState('');
  const [pageWidth, setPageWidth] = useState(600);

  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const viewerRef = useRef<HTMLDivElement>(null);
  const highlightObserverRef = useRef<MutationObserver | null>(null);

  // Fetch a temporary signed URL for the selected document.
  useEffect(() => {
    let cancelled = false;

    async function loadPdfUrl() {
      setLoadingUrl(true);
      setError('');
      setPdfUrl('');
      setNumPages(0);
      pageRefs.current = {};

      try {
        const response = await apiClient.get(
          `/api/documents/${documentId}/pdf-url`,
        );

        if (!cancelled) {
          setPdfUrl(response.data.url);
        }
      } catch {
        if (!cancelled) {
          setError('Unable to access this PDF. Please try again.');
        }
      } finally {
        if (!cancelled) {
          setLoadingUrl(false);
        }
      }
    }

    void loadPdfUrl();

    return () => {
      cancelled = true;
    };
  }, [documentId]);

  // Keep the rendered PDF pages responsive to the viewer's width.
  useEffect(() => {
    const container = viewerRef.current;
    if (!container) return;

    function updateWidth() {
      const width = container?.clientWidth;
      if (width) {
        setPageWidth(Math.max(260, width - 48));
      }
    }

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Scroll to the page selected by ChatPage citations
  useEffect(() => {
    if (
      !pageNumber ||
      pageNumber < 1 ||
      (numPages > 0 && pageNumber > numPages)
    ) {
      return;
    }

    setCurrentPage(pageNumber);
    const targetPage = pageRefs.current[pageNumber];

    if (targetPage) {
      targetPage.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, [pageNumber, numPages, pdfUrl]);

  // Track currently visible page during user scroll
  function handleScroll() {
    const container = viewerRef.current;
    if (!container || numPages === 0) return;

    const containerTop = container.scrollTop;
    const midPoint = containerTop + container.clientHeight / 3;

    for (let p = 1; p <= numPages; p++) {
      const el = pageRefs.current[p];
      if (el) {
        const top = el.offsetTop;
        const height = el.offsetHeight;
        if (top <= midPoint && top + height > midPoint) {
          setCurrentPage(p);
          break;
        }
      }
    }
  }

  function scrollToPage(page: number) {
    if (page < 1 || page > numPages) return;
    setCurrentPage(page);
    const target = pageRefs.current[page];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // ── Text-layer highlighting ────────────────────────────────────────────────
  useEffect(() => {
    if (highlightObserverRef.current) {
      highlightObserverRef.current.disconnect();
      highlightObserverRef.current = null;
    }

    if (!highlightPage || !highlightText) {
      for (const el of Object.values(pageRefs.current)) {
        if (el) clearHighlights(el);
      }
      return;
    }

    const pageEl = pageRefs.current[highlightPage];
    if (!pageEl) return;

    for (const [pg, el] of Object.entries(pageRefs.current)) {
      if (el && Number(pg) !== highlightPage) clearHighlights(el);
    }

    const immediateCount = highlightSpans(pageEl, highlightText);
    if (immediateCount > 0) return;

    const observer = new MutationObserver(() => {
      const count = highlightSpans(pageEl, highlightText);
      if (count > 0) {
        observer.disconnect();
        highlightObserverRef.current = null;
      }
    });

    observer.observe(pageEl, { childList: true, subtree: true });
    highlightObserverRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [highlightPage, highlightText]);

  async function retryLoadPdf() {
    setLoadingUrl(true);
    setError('');
    setPdfUrl('');
    setNumPages(0);
    pageRefs.current = {};

    try {
      const response = await apiClient.get(
        `/api/documents/${documentId}/pdf-url`,
      );

      setPdfUrl(response.data.url);
    } catch {
      setError('Unable to access this PDF. Please try again.');
    } finally {
      setLoadingUrl(false);
    }
  }

  if (loadingUrl) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-white px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#635BFF]/10 text-[#635BFF]">
              <FileText size={14} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#22233A]">PDF Document Viewer</h2>
              <p className="text-[11px] text-gray-400">Loading document...</p>
            </div>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center p-6 bg-[#F4F4F7]">
          <div className="flex flex-col items-center justify-center text-center max-w-sm">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#635BFF]/10 text-[#635BFF] animate-pulse">
              <FileText size={26} />
            </div>
            <h3 className="text-base font-semibold text-[#22233A]">Preparing Document</h3>
            <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">
              Generating secure viewing token and loading PDF pages...
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-[#635BFF]">
              <Loader2 className="animate-spin" size={16} />
              <span>Fetching PDF stream...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-white px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <FileText size={14} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#22233A]">PDF Document Viewer</h2>
              <p className="text-[11px] text-red-500">Document unavailable</p>
            </div>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center p-6 bg-[#F4F4F7]">
          <div className="flex flex-col items-center justify-center text-center max-w-sm rounded-2xl bg-white p-6 border border-gray-200/80 shadow-xs">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <FileText size={22} />
            </div>
            <h3 className="text-base font-semibold text-[#22233A]">Unable to load PDF</h3>
            <p className="mt-1.5 text-xs text-gray-500 leading-relaxed mb-5">
              {error}
            </p>
            <button
              type="button"
              onClick={() => void retryLoadPdf()}
              disabled={loadingUrl}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#635BFF] text-white text-xs font-medium hover:bg-[#5148E5] transition shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} />
              Retry loading PDF
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      {/* ── Polished PDF Header (Matches Chat Container Header) ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-white px-4 py-3 sm:px-5 z-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#635BFF]/10 text-[#635BFF]">
            <FileText size={14} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#22233A]">PDF Document Viewer</h2>
            <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#635BFF] animate-pulse" />
              {numPages > 0
                ? `${numPages} pages · Page ${currentPage}`
                : 'Loading document...'}
            </p>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center rounded-lg bg-gray-100/90 p-0.5 border border-gray-200/60 text-xs">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.6, Math.round((z - 0.15) * 100) / 100))}
              disabled={zoomLevel <= 0.6}
              className="p-1.5 rounded-md hover:bg-white hover:shadow-xs disabled:opacity-40 text-gray-700 transition cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut size={13} />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(1.0)}
              className="px-2 py-1 font-mono text-[11px] text-gray-600 hover:text-[#635BFF] transition cursor-pointer"
              title="Reset zoom to 100%"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(2.0, Math.round((z + 0.15) * 100) / 100))}
              disabled={zoomLevel >= 2.0}
              className="p-1.5 rounded-md hover:bg-white hover:shadow-xs disabled:opacity-40 text-gray-700 transition cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn size={13} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => void retryLoadPdf()}
            disabled={loadingPdf}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-[#635BFF] hover:bg-gray-50 transition cursor-pointer"
            title="Reload PDF"
          >
            <RefreshCw size={13} className={loadingPdf ? 'animate-spin text-[#635BFF]' : ''} />
          </button>
        </div>
      </div>

      {/* ── Scrollable PDF Canvas Area ── */}
      <div
        ref={viewerRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-auto p-4 sm:p-6 custom-scrollbar bg-[#F4F4F7]"
      >
        <Document
          file={pdfUrl}
          onLoadStart={() => setLoadingPdf(true)}
          onLoadSuccess={({ numPages: totalPages }) => {
            setNumPages(totalPages);
            setLoadingPdf(false);
            setError('');
          }}
          onLoadError={() => {
            setLoadingPdf(false);
            setError(
              'Unable to render this PDF. Please refresh and try again.',
            );
          }}
          loading={
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="animate-spin text-[#635BFF]" size={26} />
              <span className="text-xs text-gray-500 font-medium">Rendering document pages...</span>
            </div>
          }
          error={
            <div className="p-8 text-center text-sm text-red-600">
              Failed to load PDF pages.
            </div>
          }
        >
          {loadingPdf && (
            <div className="mb-4 text-center text-xs text-gray-500">
              Preparing document view...
            </div>
          )}

          {numPages > 0 && (
            <div className="space-y-6">
              {Array.from({ length: numPages }, (_, index) => {
                const page = index + 1;
                const isSelected = page === pageNumber;
                const isHighlighted = page === highlightPage && !!highlightText;

                return (
                  <div
                    key={page}
                    ref={(element) => {
                      pageRefs.current[page] = element;
                    }}
                    id={`pdf-page-${page}`}
                    className={`group relative mx-auto w-fit rounded-xl bg-white transition-all duration-200 ${
                      isHighlighted
                        ? 'ring-2 ring-emerald-400 ring-offset-4 ring-offset-[#F4F4F7] shadow-[0_8px_30px_rgba(16,185,129,0.18)]'
                        : isSelected
                        ? 'ring-2 ring-[#635BFF] ring-offset-4 ring-offset-[#F4F4F7] shadow-[0_8px_30px_rgba(99,91,255,0.18)]'
                        : 'shadow-[0_4px_20px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] border border-gray-200/60 hover:shadow-[0_8px_25px_rgba(0,0,0,0.08)]'
                    }`}
                  >
                    {/* Floating page number pill */}
                    <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      Page {page}
                    </div>

                    {/* Cited highlight badge */}
                    {isHighlighted && (
                      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500 text-[10px] font-semibold text-white shadow-sm animate-fade-in">
                        <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                        Cited Passage
                      </div>
                    )}

                    <Page
                      pageNumber={page}
                      width={Math.min(Math.max(260, pageWidth * zoomLevel), 1400)}
                      renderTextLayer
                      renderAnnotationLayer
                    />
                  </div>
                );
              })}
            </div>
          )}
        </Document>
      </div>

      {/* ── Sticky Bottom Dock Toolbar (Matches Chat Composer Position) ── */}
      <div className="shrink-0 border-t border-gray-100 bg-white/95 backdrop-blur-sm px-4 py-2.5 z-10 shadow-[0_-4px_16px_rgba(0,0,0,0.02)] flex items-center justify-between">
        {/* Page navigation controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scrollToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 active:scale-95 disabled:opacity-40 transition cursor-pointer text-gray-700"
            title="Previous page"
          >
            <ChevronLeft size={14} />
          </button>

          <div className="flex items-center gap-1 text-xs font-medium text-gray-600 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200/70">
            <span>Page</span>
            <span className="font-semibold text-[#635BFF]">{currentPage}</span>
            <span className="text-gray-400">/</span>
            <span>{numPages || 1}</span>
          </div>

          <button
            type="button"
            onClick={() => scrollToPage(currentPage + 1)}
            disabled={currentPage >= numPages}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 active:scale-95 disabled:opacity-40 transition cursor-pointer text-gray-700"
            title="Next page"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Citation Status indicator */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
          {highlightPage ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium animate-fade-in">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Highlighting citation on page {highlightPage}
            </span>
          ) : (
            <span className="text-[11px] text-gray-400">
              Click citations in chat to jump & highlight
            </span>
          )}
        </div>

        {/* Quick jump to Top / Reset */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => scrollToPage(1)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-gray-500 hover:text-[#635BFF] hover:bg-gray-50 border border-transparent hover:border-gray-200 transition cursor-pointer text-xs font-medium"
            title="Scroll to first page"
          >
            <RotateCcw size={12} />
            <span className="hidden sm:inline">First page</span>
          </button>
        </div>
      </div>
    </div>
  );
}
