import { FileText, Upload } from 'lucide-react';

// Shown when there are no documents in the library.
// Props allow the parent to wire up the upload action.
interface EmptyStateProps {
  onUploadClick: () => void;
}

export default function EmptyState({ onUploadClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-fade-in">
      {/* Icon illustration — composed from simple shapes, no images needed */}
      <div className="relative mb-6">
        {/* Background document stack (decorative) */}
        <div className="absolute -left-4 top-2 w-12 h-14 rounded-[10px] bg-[#E8E9ED] rotate-[-8deg]" aria-hidden="true" />
        <div className="absolute -right-4 top-2 w-12 h-14 rounded-[10px] bg-[#E8E5FC] rotate-[8deg]" aria-hidden="true" />
        {/* Main document icon */}
        <div className="relative w-16 h-20 rounded-[10px] bg-white border-2 border-[#E8E9ED] flex flex-col items-center justify-center shadow-sm z-10">
          <FileText size={28} className="text-[#635BFF]" aria-hidden="true" />
          {/* Tiny lines to suggest text content */}
          <div className="mt-2 space-y-1" aria-hidden="true">
            <div className="w-7 h-1 rounded-full bg-[#E8E9ED]" />
            <div className="w-5 h-1 rounded-full bg-[#E8E9ED]" />
          </div>
        </div>
      </div>

      <h2 className="text-[18px] font-semibold text-[#22233A] mb-2">
        Your library is empty
      </h2>
      <p className="text-[14px] text-[#737384] max-w-xs leading-relaxed mb-6">
        Upload a PDF to get started. Once processed, you can ask questions
        and get answers grounded in your document.
      </p>

      <button
        type="button"
        onClick={onUploadClick}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-[#635BFF] text-white text-[14px] font-medium
                   hover:bg-[#4F48D9] active:bg-[#4340C0] transition-colors duration-150 cursor-pointer"
        aria-label="Upload your first PDF"
      >
        <Upload size={16} aria-hidden="true" />
        Upload your first PDF
      </button>
    </div>
  );
}
