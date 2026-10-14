import { useEffect, useRef, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import axios from 'axios';
import type { Document } from '../types/document';
import { fetchDocuments, uploadDocument } from '../services/documentService';
import Navbar from '../components/Navbar';
import UploadArea from '../components/UploadArea';
import DocumentCard from '../components/DocumentCard';
import EmptyState from '../components/EmptyState';

interface HomePageProps {
  onOpenChat: (document: Document) => void;
  userEmail?: string;
  onSignOut?: () => void;
}

export default function HomePage({ onOpenChat, userEmail, onSignOut }: HomePageProps) {
  // ── Document library state ───────────────────────────────────────────────
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Search state ─────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');

  // ── Upload state (lifted up so HomePage can refresh the list) ───────────
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Ref to scroll to the upload area when the empty state calls onUploadClick
  const uploadRef = useRef<HTMLDivElement>(null);

  // ── Load documents on mount ──────────────────────────────────────────────
  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    setIsLoadingDocs(true);
    setLoadError(null);
    try {
      const data = await fetchDocuments();
      setDocuments(data);
    } catch {
      setLoadError('Could not load your documents. Check that the backend is running.');
    } finally {
      setIsLoadingDocs(false);
    }
  }

  // ── Upload handler ───────────────────────────────────────────────────────
  async function handleUpload(file: File) {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      await uploadDocument(file, (percent) => setUploadProgress(percent));
      setUploadSuccess(true);
      // Refresh the library so the new document appears immediately
      await loadDocuments();
    } catch (error) {
      // Extract a user-friendly message from the Axios error
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail;
        setUploadError(detail ?? 'Upload failed. Please try again.');
      } else {
        setUploadError('An unexpected error occurred.');
      }
    } finally {
      setIsUploading(false);
    }
  }

  function handleUploadReset() {
    setUploadSuccess(false);
    setUploadError(null);
    setUploadProgress(0);
  }

  function scrollToUpload() {
    uploadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ── Filtered documents by search query ──────────────────────────────────
  const filteredDocs = documents.filter((doc) =>
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Skeleton loader for the grid ─────────────────────────────────────────
  function DocumentSkeleton() {
    return (
      <div className="bg-white rounded-[14px] border border-[#E8E9ED] p-5 animate-pulse-soft">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-[10px] bg-[#E8E9ED]" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-[#E8E9ED] rounded w-3/4" />
            <div className="h-3 bg-[#E8E9ED] rounded w-1/2" />
          </div>
        </div>
        <div className="h-5 bg-[#E8E9ED] rounded-full w-16 mb-4" />
        <div className="h-9 bg-[#E8E9ED] rounded-[10px]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F6F2] flex flex-col">
      <Navbar userEmail={userEmail} onSignOut={onSignOut} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* ── Hero headline ─────────────────────────────────────────────── */}
        <section className="mb-10" aria-labelledby="hero-heading">
          <h1
            id="hero-heading"
            className="text-[28px] sm:text-[34px] font-semibold text-[#22233A] tracking-[-0.5px] leading-tight mb-2"
          >
            Your documents,{' '}
            <span className="text-shimmer">understood.</span>
          </h1>
          <p className="text-[15px] text-[#737384] max-w-md leading-relaxed">
            Upload a PDF and ask questions in plain language. DocuMind finds the
            answers within your document.
          </p>
        </section>

        {/* ── Upload section ────────────────────────────────────────────── */}
        <section
          ref={uploadRef}
          className="mb-10 bg-white rounded-[16px] border border-[#E8E9ED] p-5 sm:p-6"
          aria-labelledby="upload-heading"
        >
          <h2
            id="upload-heading"
            className="text-[15px] font-semibold text-[#22233A] mb-4"
          >
            Upload a PDF
          </h2>
          <UploadArea
            onUpload={handleUpload}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            uploadError={uploadError}
            uploadSuccess={uploadSuccess}
            onReset={handleUploadReset}
          />
        </section>

        {/* ── Document library (Fixed container with internal scrolling) ── */}
        <section
          aria-labelledby="library-heading"
          className="bg-white rounded-[16px] border border-[#E8E9ED] shadow-sm flex flex-col overflow-hidden"
        >
          {/* Fixed Container Header */}
          <div className="shrink-0 px-5 sm:px-6 py-4 border-b border-[#E8E9ED] bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <h2
                id="library-heading"
                className="text-[16px] sm:text-[17px] font-semibold text-[#22233A] flex items-center gap-2"
              >
                Your library
                {documents.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[12px] font-medium bg-[#E8E5FC] text-[#635BFF]">
                    {documents.length} {documents.length === 1 ? 'document' : 'documents'}
                  </span>
                )}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {/* Search — only show if there are documents */}
              {documents.length > 0 && (
                <div className="relative flex-1 sm:flex-initial">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737384] pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="library-search"
                    type="search"
                    placeholder="Search documents…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-56 pl-8.5 pr-3 py-1.5 rounded-[10px] text-[13px]
                               bg-[#F7F6F2] border border-transparent text-[#22233A]
                               placeholder:text-[#737384]
                               focus:bg-white focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/15
                               outline-none transition-all duration-150"
                    aria-label="Search your documents"
                  />
                </div>
              )}

              {/* Refresh button */}
              <button
                type="button"
                onClick={loadDocuments}
                disabled={isLoadingDocs}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] border border-[#E8E9ED]
                           text-[13px] font-medium text-[#737384] hover:text-[#635BFF] hover:bg-[#F7F6F2]
                           disabled:opacity-50 transition-colors cursor-pointer shrink-0"
                aria-label="Refresh library"
                title="Refresh library"
              >
                <Loader2
                  size={13}
                  className={isLoadingDocs ? 'animate-spin text-[#635BFF]' : ''}
                  aria-hidden="true"
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Fixed Container Body: Internal Scroll Area */}
          <div className="h-[480px] sm:h-[520px] overflow-y-auto p-5 sm:p-6 custom-scrollbar bg-[#FAFAFC]/30">
            {/* Loading skeletons */}
            {isLoadingDocs && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" aria-busy="true" aria-label="Loading documents">
                {[1, 2, 3, 4].map((i) => <DocumentSkeleton key={i} />)}
              </div>
            )}

            {/* Load error */}
            {!isLoadingDocs && loadError && (
              <div
                role="alert"
                className="flex items-center justify-between gap-3 px-4 py-4 rounded-[12px]
                           bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-[14px]"
              >
                <span>{loadError}</span>
                <button
                  type="button"
                  onClick={loadDocuments}
                  className="text-[13px] font-medium underline underline-offset-2 hover:no-underline transition-all cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Empty state */}
            {!isLoadingDocs && !loadError && documents.length === 0 && (
              <div className="h-full flex items-center justify-center">
                <EmptyState onUploadClick={scrollToUpload} />
              </div>
            )}

            {/* Search: no results */}
            {!isLoadingDocs && !loadError && documents.length > 0 && filteredDocs.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-[#E8E9ED]/60 flex items-center justify-center mb-3 text-[#737384]">
                  <Search size={20} />
                </div>
                <p className="text-[14px] text-[#22233A] font-medium">No documents found</p>
                <p className="text-[13px] text-[#737384] mt-1">
                  No documents match "<strong>{searchQuery}</strong>"
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-3 text-[13px] text-[#635BFF] hover:underline cursor-pointer"
                >
                  Clear search
                </button>
              </div>
            )}

            {/* Document grid */}
            {!isLoadingDocs && !loadError && filteredDocs.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredDocs.map((doc, index) => (
                  <div
                    key={doc.document_id}
                    className="animate-slide-in-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <DocumentCard
                      document={doc}
                      onChatClick={onOpenChat}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer status summary bar (if documents exist) */}
          {!isLoadingDocs && !loadError && documents.length > 0 && (
            <div className="shrink-0 px-5 sm:px-6 py-2.5 bg-white border-t border-[#E8E9ED] flex items-center justify-between text-[12px] text-[#737384]">
              <span>
                {filteredDocs.length === documents.length
                  ? `Showing all ${documents.length} ${documents.length === 1 ? 'document' : 'documents'}`
                  : `Showing ${filteredDocs.length} of ${documents.length} documents`}
              </span>
              <span className="text-[11px] text-[#9A9AAD]">
                Scroll within container to view more
              </span>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
