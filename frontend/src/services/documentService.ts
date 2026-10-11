import apiClient from './api';
import type { Document, UploadResponse } from '../types/document';

// Fetch all documents for the current user from GET /api/documents.
// Returns the array directly — callers handle errors.
export async function fetchDocuments(): Promise<Document[]> {
  const response = await apiClient.get<Document[]>('/api/documents');
  return response.data;
}

// Upload a PDF file to POST /api/documents/upload.
// Uses FormData because the backend expects multipart/form-data with field name "file".
// The optional onProgress callback receives a 0–100 upload percentage.
export async function uploadDocument(
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<UploadResponse>(
    '/api/documents/upload',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          const percent = Math.round((event.loaded * 100) / event.total);
          onProgress(percent);
        }
      },
    }
  );

  return response.data;
}
