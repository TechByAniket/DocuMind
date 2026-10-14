
import { useEffect, useRef, useState } from 'react';
import { FileText, Loader2, RefreshCw } from 'lucide-react';
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
  // Remove any previous highlights first.
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
      span.style.backgroundColor = 'rgba(34, 197, 94, 0.35)'; // green-500 at 35% opacity
      span.style.borderRadius = '2px';
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
  const [loadingUrl, setLoadingUrl] = useState(true);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [error, setError] = useState('');
  const [pageWidth, setPageWidth] = useState(600);

  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const viewerRef = useRef<HTMLDivElement>(null);
  // Keep a ref to the active MutationObserver so we can clean it up.
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
        setPageWidth(Math.max(250, width - 32));
      }
    }

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Scroll to the page selected by ChatPage.
  useEffect(() => {
    if (
      !pageNumber ||
      pageNumber < 1 ||
      (numPages > 0 && pageNumber > numPages)
    ) {
      return;
    }

    const targetPage = pageRefs.current[pageNumber];

    if (targetPage) {
      targetPage.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, [pageNumber, numPages, pdfUrl]);

  // ── Text-layer highlighting ────────────────────────────────────────────────
  // When highlightPage / highlightText change, attempt to highlight the target
  // passage. The react-pdf text layer renders asynchronously, so we use a
  // MutationObserver to wait until the spans are present before searching.
  useEffect(() => {
    // Disconnect any previous observer.
    if (highlightObserverRef.current) {
      highlightObserverRef.current.disconnect();
      highlightObserverRef.current = null;
    }

    if (!highlightPage || !highlightText) {
      // Clear all highlights when no target is set.
      for (const el of Object.values(pageRefs.current)) {
        if (el) clearHighlights(el);
      }
      return;
    }

    const pageEl = pageRefs.current[highlightPage];

    if (!pageEl) return;

    // Clear stale highlights on all other pages.
    for (const [pg, el] of Object.entries(pageRefs.current)) {
      if (el && Number(pg) !== highlightPage) clearHighlights(el);
    }

    // Try immediately — the page may already be rendered.
    const immediateCount = highlightSpans(pageEl, highlightText);
    if (immediateCount > 0) return;

    // The text layer is not ready yet. Watch for DOM changes on this page.
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
      <div className="flex h-full min-h-80 items-center justify-center">
        <Loader2 className="animate-spin text-[#635BFF]" size={24} />
        <span className="ml-2 text-sm text-gray-500">
          Loading PDF...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full min-h-80 flex-col items-center justify-center gap-3 p-6 text-center">
        <FileText size={36} className="text-gray-400" />

        <p className="text-sm text-gray-600">{error}</p>

        <button
          type="button"
          onClick={() => void retryLoadPdf()}
          disabled={loadingUrl}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={14} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-gray-100">
      {/* PDF header */}
      <div className="flex shrink-0 items-center justify-between border-b bg-white px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <FileText size={17} className="text-[#635BFF]" />
          PDF Preview
        </div>

        <span className="text-xs text-gray-500">
          {numPages > 0
            ? `${numPages} pages`
            : 'Loading document'}
        </span>
      </div>

      {/* Scrollable PDF pages */}
      <div
        ref={viewerRef}
        className="min-h-0 flex-1 overflow-auto p-4"
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
            <div className="flex justify-center py-10">
              <Loader2
                className="animate-spin text-[#635BFF]"
                size={24}
              />
            </div>
          }
          error={
            <p className="py-10 text-center text-sm text-red-600">
              Failed to load PDF.
            </p>
          }
        >
          {loadingPdf && (
            <div className="mb-3 text-center text-xs text-gray-500">
              Preparing document...
            </div>
          )}

          {numPages > 0 && (
            <div className="space-y-4">
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
                    className={`mx-auto w-fit rounded shadow-sm transition-shadow ${
                      isHighlighted
                        ? 'ring-2 ring-green-400 ring-offset-2'
                        : isSelected
                        ? 'ring-2 ring-[#635BFF] ring-offset-2'
                        : ''
                    }`}
                  >
                    <Page
                      pageNumber={page}
                      width={Math.min(pageWidth, 900)}
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
    </div>
  );
}
