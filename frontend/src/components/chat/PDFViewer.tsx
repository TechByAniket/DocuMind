
import { useEffect, useState } from 'react';
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
}

export default function PDFViewer({
  documentId,
  pageNumber = 1,
}: PDFViewerProps) {
  const [pdfUrl, setPdfUrl] = useState('');
  const [numPages, setNumPages] = useState(0);
  const [loadingUrl, setLoadingUrl] = useState(true);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [error, setError] = useState('');
  const [pageWidth, setPageWidth] = useState(600);

  useEffect(() => {
    let cancelled = false;

    async function loadPdfUrl() {
      setLoadingUrl(true);
      setError('');
      setPdfUrl('');

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

  useEffect(() => {
    function updateWidth() {
      const containerWidth = document.getElementById('pdf-viewer-container')
        ?.clientWidth;

      if (containerWidth) {
        setPageWidth(Math.max(250, containerWidth - 32));
      }
    }

    updateWidth();
    window.addEventListener('resize', updateWidth);

    return () => {
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

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
          onClick={() => {
            setPdfUrl('');
            setLoadingUrl(true);
            setError('');

            void apiClient
              .get(`/api/documents/${documentId}/pdf-url`)
              .then((response) => setPdfUrl(response.data.url))
              .catch(() =>
                setError('Unable to access this PDF. Please try again.'),
              )
              .finally(() => setLoadingUrl(false));
          }}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
        >
          <RefreshCw size={14} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      id="pdf-viewer-container"
      className="flex h-full min-h-0 flex-col overflow-hidden bg-gray-100"
    >
      <div className="flex items-center justify-between border-b bg-white px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <FileText size={17} className="text-[#635BFF]" />
          PDF Preview
        </div>

        <span className="text-xs text-gray-500">
          {numPages > 0 ? `${numPages} pages` : 'Loading document'}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
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
              <Loader2 className="animate-spin text-[#635BFF]" size={24} />
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

                return (
                  <div
                    key={page}
                    id={`pdf-page-${page}`}
                    className={`mx-auto w-fit rounded shadow-sm ${
                      page === pageNumber
                        ? 'ring-2 ring-[#635BFF]'
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
