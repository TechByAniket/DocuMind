// A source reference returned alongside an AI answer
export interface Source {
  page_number: number;
  document_id: string;
  chunk_text?: string; // The exact retrieved passage, used for PDF text highlighting
}

// The response shape from POST /api/chat
export interface ChatResponse {
  answer: string;
  sources: Source[];
}

// A single message in the chat conversation (stored in React state)
export interface ChatMessage {
  id?: string;          // Optional — streaming path omits this
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];   // Only present on assistant messages
}
