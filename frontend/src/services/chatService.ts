import apiClient from './api';
import type { ChatResponse } from '../types/chat';

// Send a question to the chat endpoint.
// IMPORTANT: The backend's /api/chat currently does NOT accept document_id —
// it searches across all ingested document vectors globally.
// The document_id parameter is kept here for clarity and future backend updates.
export async function askQuestion(
  question: string,
  documentId: string
): Promise<ChatResponse> {
  const response = await apiClient.post<ChatResponse>('/api/chat', {
    question,
    document_id: documentId,
  });

  return response.data;
}
