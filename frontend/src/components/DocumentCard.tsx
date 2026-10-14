import { FileText, MessageCircle, Clock, Layers, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import type { Document } from '../types/document';

interface DocumentCardProps {
  document: Document;
  onChatClick: (document: Document) => void;
}

// Format an ISO date string into a human-readable relative date.
// e.g. "Oct 10" or "Yesterday" or "Just now"
function formatDate(isoString: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Strip the .pdf extension for a cleaner display name.
function displayName(filename: string): string {
  return filename.replace(/\.pdf$/i, '');
}

export default function DocumentCard({ document, onChatClick }: DocumentCardProps) {
  const isReady = document.status === 'READY';
  const isProcessing = document.status === 'PROCESSING';
  const isFailed = document.status === 'FAILED';

  return (
    <article
      onClick={() => isReady && onChatClick(document)}
      className={`group relative bg-white rounded-[14px] border border-[#E8E9ED] p-5
                 hover:border-[#C4C0F7] hover:shadow-[0_8px_24px_rgba(99,91,255,0.10)]
                 hover:-translate-y-0.5 hover:scale-[1.005]
                 transition-all duration-200 ease-out ${isReady ? 'cursor-pointer' : ''}`}
      aria-label={`Document: ${document.filename}`}
    >
      {/* Top section: icon + file info */}
      <div className="flex items-start gap-3 mb-4">
        {/* PDF icon badge */}
        <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#E8E5FC] to-[#D4CFFA]
                        group-hover:from-[#635BFF] group-hover:to-[#7B75FF]
                        flex items-center justify-center flex-shrink-0 transition-all duration-200">
          <FileText size={18} className="text-[#635BFF] group-hover:text-white transition-colors duration-200" aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0">
          <h3
            className="font-semibold text-[#22233A] text-[14px] leading-snug line-clamp-2 mb-0.5"
            title={document.filename}
          >
            {displayName(document.filename)}
          </h3>

          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#737384]">
            {document.page_count != null && (
              <span className="flex items-center gap-1">
                <Layers size={11} aria-hidden="true" />
                {document.page_count} {document.page_count === 1 ? 'page' : 'pages'}
              </span>
            )}
            {document.created_at && (
              <span className="flex items-center gap-1">
                <Clock size={11} aria-hidden="true" />
                {formatDate(document.created_at)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Status badge */}
      <div className="mb-4">
        {isReady && (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                       bg-[#DFF3E7] text-[#2D7A4F] text-[11px] font-medium"
            aria-label="Status: Ready"
          >
            <CheckCircle2 size={11} aria-hidden="true" />
            Ready
          </span>
        )}
        {isProcessing && (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                       bg-[#FFFBEB] text-[#D97706] text-[11px] font-medium"
            aria-label="Status: Processing"
          >
            <Loader2 size={11} className="animate-spin" aria-hidden="true" />
            Processing…
          </span>
        )}
        {isFailed && (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                       bg-[#FEF2F2] text-[#DC2626] text-[11px] font-medium"
            aria-label="Status: Failed"
          >
            <AlertCircle size={11} aria-hidden="true" />
            Failed
          </span>
        )}
      </div>

      {/* Action button */}
      <button
        type="button"
        onClick={() => onChatClick(document)}
        disabled={!isReady}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-[10px]
                   text-[13px] font-medium transition-all duration-150 cursor-pointer
                   disabled:opacity-40 disabled:cursor-not-allowed
                   bg-[#635BFF] text-white hover:bg-[#4F48D9] active:scale-[0.98] active:bg-[#4340C0]
                   shadow-[0_1px_3px_rgba(99,91,255,0.3)] hover:shadow-[0_3px_8px_rgba(99,91,255,0.4)]"
        aria-label={isReady ? `Chat with ${document.filename}` : `${document.filename} is not ready yet`}
      >
        <MessageCircle size={14} aria-hidden="true" />
        {isReady ? 'Chat with PDF' : isProcessing ? 'Processing…' : 'Unavailable'}
        {isReady && (
          <span className="ml-auto opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-150" aria-hidden="true">
            →
          </span>
        )}
      </button>
    </article>
  );
}
