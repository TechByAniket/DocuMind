// A source reference returned alongside an AI answer
export interface Source {
  page_number: number;
  document_id: string;
}

// The response shape from POST /api/chat
export interface ChatResponse {
  answer: string;
  sources: Source[];
}

// A single message in the chat conversation (stored in React state)
export interface ChatMessage {
  id: string;           // Random ID for React key prop
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];   // Only present on assistant messages
}
