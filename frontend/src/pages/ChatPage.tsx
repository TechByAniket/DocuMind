import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Send, Loader2, FileText, AlertCircle, RefreshCw, BookOpen } from 'lucide-react';
import axios from 'axios';
import type { Document } from '../types/document';
import type { ChatMessage } from '../types/chat';
import { askQuestion } from '../services/chatService';
import Navbar from '../components/Navbar';

interface ChatPageProps {
  document: Document;
  onBack: () => void;
}

// These chips appear before the user sends their first message.
// They give the user an idea of what to ask.
const SUGGESTED_QUESTIONS = [
  'Summarize this document',
  'Explain the main concepts',
  'What are the key takeaways?',
  'List the important points',
];

// ── Markdown-like renderer ───────────────────────────────────────────────────
// The AI sometimes returns bold text (**word**), bullet points, and numbered lists.
// This is a simple transformation — not a full Markdown parser.
function renderAnswer(text: string): React.ReactNode {
  const lines = text.split('\n');

  return lines.map((line, i) => {
    const trimmed = line.trim();

    // Numbered list item: "1. Something"
    if (/^\d+\.\s/.test(trimmed)) {
      return (
        <div key={i} className="flex gap-2 mb-1">
          <span className="flex-shrink-0 font-medium text-[#635BFF] text-[13px] leading-6">
            {trimmed.match(/^(\d+)\./)?.[1]}.
          </span>
          <span>{inlineFormat(trimmed.replace(/^\d+\.\s/, ''))}</span>
        </div>
      );
    }

    // Bullet point: "- Something" or "• Something"
    if (/^[-•*]\s/.test(trimmed)) {
      return (
        <div key={i} className="flex gap-2 mb-1">
          <span className="flex-shrink-0 text-[#635BFF] leading-6 text-[10px] mt-1">●</span>
          <span>{inlineFormat(trimmed.replace(/^[-•*]\s/, ''))}</span>
        </div>
      );
    }

    // Empty line becomes spacing
    if (trimmed === '') return <div key={i} className="h-2" />;

    // Regular paragraph
    return <p key={i} className="mb-1 leading-relaxed">{inlineFormat(trimmed)}</p>;
  });
}

// Turn **bold** text into <strong> elements within a line
function inlineFormat(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-[#22233A]">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// ── Typing indicator (three bouncing dots) ────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3" aria-label="AI is generating a response">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-[#635BFF] opacity-60"
          style={{ animation: `pulse-soft 1.2s ease-in-out ${i * 0.2}s infinite` }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export default function ChatPage({ document, onBack }: ChatPageProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [lastFailedQuestion, setLastFailedQuestion] = useState<string | null>(null);

  // Auto-scroll to the bottom after each new message
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAsking]);

  // ── Send a question ─────────────────────────────────────────────────────
  async function sendQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed || isAsking) return;

    // Optimistically add the user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setChatError(null);
    setLastFailedQuestion(null);
    setIsAsking(true);

    try {
      const response = await askQuestion(trimmed, document.document_id);

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      // Remove the optimistically added user message on failure
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
      setLastFailedQuestion(trimmed);

      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail;
        setChatError(detail ?? 'The request failed. Please try again.');
      } else {
        setChatError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsAsking(false);
    }
  }

  // ── Keyboard handling for textarea ──────────────────────────────────────
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter submits; Shift+Enter inserts a newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuestion(inputValue);
    }
  }

  // Auto-grow textarea height as the user types
  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInputValue(e.target.value);
    // Reset height first so it can shrink, then set to scrollHeight
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  }

  // ── Retry last failed question ──────────────────────────────────────────
  function handleRetry() {
    if (lastFailedQuestion) {
      setChatError(null);
      sendQuestion(lastFailedQuestion);
    }
  }

  // Strip .pdf for display
  const docDisplayName = document.filename.replace(/\.pdf$/i, '');
  const hasMessages = messages.length > 0;

  return (
    <div className="min-h-screen bg-[#F7F6F2] flex flex-col">
      {/* Navbar with back button */}
      <Navbar
        rightSlot={
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-[13px] text-[#737384]
                       hover:text-[#22233A] transition-colors duration-150 cursor-pointer"
            aria-label="Back to document library"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Library
          </button>
        }
      />

      {/* Document context banner */}
      <div className="bg-white border-b border-[#E8E9ED]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[8px] bg-[#E8E5FC] flex items-center justify-center flex-shrink-0">
            <FileText size={14} className="text-[#635BFF]" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-[#22233A] truncate">{docDisplayName}</p>
            {document.page_count != null && (
              <p className="text-[11px] text-[#737384]">
                {document.page_count} {document.page_count === 1 ? 'page' : 'pages'}
              </p>
            )}
          </div>
          <div className="ml-auto flex-shrink-0">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#DFF3E7] text-[#2D7A4F] text-[11px] font-medium">
              Ready
            </span>
          </div>
        </div>
      </div>

      {/* Chat area — flex-1 so it fills remaining height */}
      <main className="flex-1 flex flex-col max-w-3xl w-full mx-auto px-4 sm:px-6 pb-4">

        {/* Message list */}
        <div className="flex-1 overflow-y-auto py-6 space-y-4" role="log" aria-live="polite" aria-label="Chat conversation">

          {/* Welcome / empty chat state */}
          {!hasMessages && (
            <div className="flex flex-col items-center text-center pt-8 pb-4 animate-fade-in">
              <div className="w-12 h-12 rounded-[14px] bg-[#E8E5FC] flex items-center justify-center mb-4">
                <BookOpen size={22} className="text-[#635BFF]" aria-hidden="true" />
              </div>
              <h2 className="text-[17px] font-semibold text-[#22233A] mb-1.5">
                Ask about your document
              </h2>
              <p className="text-[13px] text-[#737384] max-w-xs leading-relaxed mb-8">
                Ask any question and DocuMind will find the answer inside{' '}
                <span className="font-medium text-[#22233A]">{docDisplayName}</span>.
              </p>

              {/* Suggested question chips */}
              <div className="flex flex-wrap gap-2 justify-center" role="list" aria-label="Suggested questions">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    role="listitem"
                    onClick={() => sendQuestion(q)}
                    disabled={isAsking}
                    className="px-3.5 py-2 rounded-full border border-[#E8E9ED] bg-white
                               text-[13px] text-[#22233A] hover:border-[#635BFF] hover:text-[#635BFF]
                               hover:bg-[#F5F4FE] transition-all duration-150 cursor-pointer
                               disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex animate-fade-slide-up ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {/* Assistant icon */}
              {message.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-[#635BFF] flex items-center justify-center flex-shrink-0 mt-0.5 mr-2.5">
                  <BookOpen size={13} color="white" aria-hidden="true" />
                </div>
              )}

              <div className={`
                max-w-[82%] sm:max-w-[75%] rounded-[14px] px-4 py-3
                ${message.role === 'user'
                  ? 'bg-[#635BFF] text-white rounded-br-[4px]'
                  : 'bg-white border border-[#E8E9ED] text-[#22233A] rounded-bl-[4px]'
                }
              `}>
                {message.role === 'user' ? (
                  <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
                ) : (
                  <div className="text-[14px] leading-relaxed">
                    {renderAnswer(message.content)}

                    {/* Source citations */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[#E8E9ED]">
                        <p className="text-[11px] font-medium text-[#737384] mb-2 uppercase tracking-wide">
                          Sources
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {/* Deduplicate page numbers before rendering */}
                          {[...new Set(message.sources.map((s) => s.page_number))]
                            .sort((a, b) => a - b)
                            .map((page) => (
                              <span
                                key={page}
                                className="inline-flex items-center px-2 py-0.5 rounded-full
                                           bg-[#E8E5FC] text-[#635BFF] text-[11px] font-medium"
                                aria-label={`Source: Page ${page}`}
                              >
                                Page {page}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isAsking && (
            <div className="flex items-start animate-fade-in">
              <div className="w-7 h-7 rounded-full bg-[#635BFF] flex items-center justify-center flex-shrink-0 mr-2.5">
                <BookOpen size={13} color="white" aria-hidden="true" />
              </div>
              <div className="bg-white border border-[#E8E9ED] rounded-[14px] rounded-bl-[4px]">
                <TypingIndicator />
              </div>
            </div>
          )}

          {/* Error state */}
          {chatError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 px-4 py-3.5 rounded-[12px]
                         bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-[13px] animate-fade-in"
            >
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1">
                <p className="font-medium mb-0.5">Something went wrong</p>
                <p className="text-[12px] opacity-80">{chatError}</p>
              </div>
              {lastFailedQuestion && (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="flex items-center gap-1 text-[12px] font-medium text-[#DC2626]
                             hover:underline cursor-pointer flex-shrink-0"
                  aria-label="Retry sending the last question"
                >
                  <RefreshCw size={12} aria-hidden="true" />
                  Retry
                </button>
              )}
            </div>
          )}

          {/* Invisible div to scroll into view */}
          <div ref={bottomRef} aria-hidden="true" />
        </div>

        {/* ── Message composer ──────────────────────────────────────────── */}
        <div className="bg-white rounded-[16px] border border-[#E8E9ED] shadow-sm p-3">
          <div className="flex items-end gap-2">
            <label htmlFor="chat-input" className="sr-only">
              Ask a question about {document.filename}
            </label>
            <textarea
              ref={textareaRef}
              id="chat-input"
              rows={1}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about this document…"
              disabled={isAsking}
              className="flex-1 resize-none text-[14px] text-[#22233A] placeholder:text-[#737384]
                         bg-transparent outline-none leading-relaxed py-1.5
                         disabled:opacity-50"
              style={{ minHeight: '36px', maxHeight: '160px' }}
              aria-label="Chat message input"
            />

            <button
              type="button"
              onClick={() => sendQuestion(inputValue)}
              disabled={!inputValue.trim() || isAsking}
              className="flex-shrink-0 w-9 h-9 rounded-[10px] flex items-center justify-center
                         bg-[#635BFF] text-white transition-all duration-150 cursor-pointer
                         hover:bg-[#4F48D9] active:bg-[#4340C0]
                         disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              {isAsking
                ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                : <Send size={15} aria-hidden="true" />
              }
            </button>
          </div>

          <p className="text-[11px] text-[#9A9AAD] mt-2 pl-1">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </main>
    </div>
  );
}
