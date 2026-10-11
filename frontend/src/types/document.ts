// Represents a document returned by GET /api/documents
export interface Document {
  document_id: string;
  filename: string;
  // Backend uses: "PROCESSING" | "READY" | "FAILED"
  status: 'PROCESSING' | 'READY' | 'FAILED';
  page_count: number | null;
  chunk_count: number | null;
  created_at: string | null; // ISO 8601 string
}

// The shape of the upload response from POST /api/documents/upload
export interface UploadResponse {
  message: string;
  document_id: string;
  filename: string;
  status: string;
}
