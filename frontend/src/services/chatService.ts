import apiClient from './api';
import type { ChatResponse } from '../types/chat';
import { supabase } from '../lib/supabase';

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

export async function streamQuestion(
  question: string,
  documentId: string,
  onChunk: (text: string) => void
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Please log in again.');
  }

  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'}/api/chat/stream`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        question,
        document_id: documentId,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Chat request failed: ${response.status}`);
  }

  if (!response.body) {
    throw new Error('Streaming response is unavailable.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { value, done } = await reader.read();

      if (done) break;

      onChunk(decoder.decode(value, { stream: true }));
    }

    const remaining = decoder.decode();

    if (remaining) {
      onChunk(remaining);
    }
  } finally {
    reader.releaseLock();
  }
}
