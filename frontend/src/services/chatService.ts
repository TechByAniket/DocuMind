import apiClient from './api';
import type { ChatResponse, Source } from '../types/chat';
import { supabase } from '../lib/supabase';

// Send a question to the chat endpoint.
export async function askQuestion(
  question: string,
  documentId: string
): Promise<ChatResponse> {
  const response = await apiClient.post<ChatResponse>('/api/chat', {
    question,
    document_id: documentId,
  });

  const data = response.data;
  const lowerAnswer = (data.answer || '').toLowerCase();
  if (
    lowerAnswer.includes("couldn't find the answer in the provided document") ||
    lowerAnswer.includes("could not find the answer in the provided document")
  ) {
    data.sources = [];
  }
  return data;
}

const SOURCES_SENTINEL = '\n\n__SOURCES__:';

export async function streamQuestion(
  question: string,
  documentId: string,
  onChunk: (text: string) => void,
): Promise<Source[]> {
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

  // Stream tokens live for a good UX while buffering the full text.
  let rawText = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      rawText += chunk;
      onChunk(chunk);
    }
    const remaining = decoder.decode();
    if (remaining) {
      rawText += remaining;
      onChunk(remaining);
    }
  } finally {
    reader.releaseLock();
  }

  // Detect and strip the sources trailer the backend appended after the answer.
  const sentinelIndex = rawText.indexOf(SOURCES_SENTINEL);
  let sources: Source[] = [];

  if (sentinelIndex !== -1) {
    const answerText = rawText.slice(0, sentinelIndex);
    // Overwrite the displayed text with the clean answer (no trailer).
    // A negative-length string replaces the full accumulated content.
    onChunk('\x00REPLACE\x00' + answerText);
    try {
      const parsedSources = JSON.parse(
        rawText.slice(sentinelIndex + SOURCES_SENTINEL.length)
      ) as Source[];
      const lowerAnswer = answerText.toLowerCase();
      if (
        !lowerAnswer.includes("couldn't find the answer in the provided document") &&
        !lowerAnswer.includes("could not find the answer in the provided document")
      ) {
        sources = parsedSources;
      }
    } catch {
      // Malformed trailer — no sources
    }
  }

  return sources;
}
