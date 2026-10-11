import { useRef, useState } from 'react';
import { Upload, FileText, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

interface UploadAreaProps {
  // Called with the validated File when the user wants to upload
  onUpload: (file: File) => Promise<void>;
  // True while a request is in-flight — disables the area
  isUploading: boolean;
  // 0–100 upload progress percentage (from Axios)
  uploadProgress: number;
  // Error message from the last failed attempt, or null
  uploadError: string | null;
  // Set to true once backend confirms success
  uploadSuccess: boolean;
  // Lets the parent reset after the user dismisses a success state
  onReset: () => void;
}

export default function UploadArea({
  onUpload,
  isUploading,
  uploadProgress,
  uploadError,
  uploadSuccess,
  onReset,
}: UploadAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // ── Validation ──────────────────────────────────────────────────────────
  function validate(file: File): string | null {
    if (!file.name.toLowerCase().endsWith('.pdf') || file.type !== 'application/pdf') {
      return 'Only PDF files are supported.';
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `File is too large. Maximum allowed size is 10 MB.`;
    }
    return null;
  }

  function handleFileChosen(file: File) {
    setValidationError(null);
    const error = validate(file);
    if (error) {
      setValidationError(error);
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  }

  // ── Input & Drag handlers ───────────────────────────────────────────────
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileChosen(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileChosen(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!isUploading) setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  // ── Upload trigger ──────────────────────────────────────────────────────
  async function handleUploadClick() {
    if (!selectedFile || isUploading) return;
    await onUpload(selectedFile);
  }

  // ── Reset (clear selected file, error, success) ─────────────────────────
  function handleReset() {
    setSelectedFile(null);
    setValidationError(null);
    if (inputRef.current) inputRef.current.value = '';
    onReset();
  }

  // ── Keyboard: allow Enter / Space to open the file picker ───────────────
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if ((e.key === 'Enter' || e.key === ' ') && !isUploading && !selectedFile) {
      e.preventDefault();
      inputRef.current?.click();
    }
  }

  // ── Derived display state ────────────────────────────────────────────────
  const activeError = validationError ?? uploadError;
  const showDropZone = !selectedFile && !uploadSuccess;

  return (
    <div className="w-full">
      {/* Success state */}
      {uploadSuccess && (
        <div
          className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-[12px]
                     bg-[#DFF3E7] border border-[#B8E6CB] animate-fade-in"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2.5 text-[14px] font-medium text-[#2D7A4F]">
            <CheckCircle2 size={18} aria-hidden="true" />
            Document uploaded and ready to chat!
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="text-[#2D7A4F] hover:text-[#1F5C3A] transition-colors cursor-pointer"
            aria-label="Upload another document"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Drop zone — shown when no file is selected and upload didn't succeed */}
      {showDropZone && (
        <div
          role="button"
          tabIndex={isUploading ? -1 : 0}
          aria-label="Upload PDF — click or drag and drop a file here"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onKeyDown={handleKeyDown}
          onClick={() => !isUploading && inputRef.current?.click()}
          className={`
            relative flex flex-col items-center justify-center gap-3
            border-2 border-dashed rounded-[14px] px-6 py-10
            transition-all duration-200 cursor-pointer select-none
            ${isDragOver
              ? 'border-[#635BFF] bg-[#F0EFFE] scale-[1.005]'
              : 'border-[#D0D1D9] bg-[#FAFAF8] hover:border-[#635BFF] hover:bg-[#F5F4FE]'
            }
            ${isUploading ? 'pointer-events-none opacity-50' : ''}
          `}
        >
          <div className={`
            w-12 h-12 rounded-[12px] flex items-center justify-center
            transition-colors duration-200
            ${isDragOver ? 'bg-[#635BFF]' : 'bg-[#E8E5FC]'}
          `}>
            <Upload
              size={22}
              className={isDragOver ? 'text-white' : 'text-[#635BFF]'}
              aria-hidden="true"
            />
          </div>

          <div className="text-center">
            <p className="text-[14px] font-medium text-[#22233A]">
              {isDragOver ? 'Drop your PDF here' : 'Upload a PDF'}
            </p>
            <p className="text-[13px] text-[#737384] mt-1">
              Drag & drop or <span className="text-[#635BFF] font-medium">browse</span> · Max 10 MB
            </p>
          </div>

          {/* Hidden native file input */}
          <input
            ref={inputRef}
            id="pdf-upload-input"
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleInputChange}
            className="sr-only"
            aria-label="Choose PDF file"
          />
        </div>
      )}

      {/* Selected file row — shown after a file is picked but before upload */}
      {selectedFile && !uploadSuccess && (
        <div className="animate-fade-in">
          <div className="flex items-center gap-3 px-4 py-3 rounded-[12px] bg-white border border-[#E8E9ED] mb-3">
            <div className="w-8 h-8 rounded-[8px] bg-[#E8E5FC] flex items-center justify-center flex-shrink-0">
              <FileText size={15} className="text-[#635BFF]" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[#22233A] truncate">
                {selectedFile.name}
              </p>
              <p className="text-[12px] text-[#737384]">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            {!isUploading && (
              <button
                type="button"
                onClick={handleReset}
                className="text-[#737384] hover:text-[#22233A] transition-colors cursor-pointer"
                aria-label="Remove selected file"
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Upload progress bar */}
          {isUploading && (
            <div className="mb-3 animate-fade-in" role="status" aria-live="polite">
              <div className="flex items-center justify-between text-[12px] text-[#737384] mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                  {uploadProgress < 100 ? `Uploading… ${uploadProgress}%` : 'Processing document…'}
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#E8E9ED] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#635BFF] rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                  aria-valuenow={uploadProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  role="progressbar"
                />
              </div>
            </div>
          )}

          {/* Upload button */}
          {!isUploading && (
            <button
              type="button"
              onClick={handleUploadClick}
              disabled={isUploading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[10px]
                         bg-[#635BFF] text-white text-[14px] font-medium
                         hover:bg-[#4F48D9] active:bg-[#4340C0]
                         transition-colors duration-150 cursor-pointer
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload size={15} aria-hidden="true" />
              Upload PDF
            </button>
          )}
        </div>
      )}

      {/* Validation or API error */}
      {activeError && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2 px-3.5 py-3 rounded-[10px]
                     bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-[13px] animate-fade-in"
        >
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>{activeError}</span>
        </div>
      )}
    </div>
  );
}
