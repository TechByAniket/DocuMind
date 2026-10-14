import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Send,
  Loader2,
  FileText,
  AlertCircle,
  RefreshCw,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import axios from 'axios';

import type { Document } from '../types/document';
import type { ChatMessage } from '../types/chat';

import { streamQuestion } from '../services/chatService';
import Navbar from '../components/Navbar';
import AnswerRenderer from '../components/chat/AnswerRenderer';
import TypingIndicator from '../components/chat/TypingIndicator';
import PDFViewer from '../components/chat/PDFViewer';

interface ChatPageProps {
  document: Document;
  onBack: () => void;
  userEmail?: string;
  onSignOut?: () => void;
}

const SUGGESTED_QUESTIONS = [
  'Summarize this document',
  'What are the key points?',
  'Explain the main concepts',
  'What are the important conclusions?',
];

export default function ChatPage({
  document,
  onBack,
  userEmail,
  onSignOut,
}: ChatPageProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [chatError, setChatError] = useState('');
  const [lastFailedQuestion, setLastFailedQuestion] = useState('');
  const [selectedPage, setSelectedPage] = useState(1);
  const [activeHighlight, setActiveHighlight] = useState<{ page: number; text: string } | null>(null);
  const [mobileTab, setMobileTab] = useState<'pdf' | 'chat'>('chat');

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function resetTextareaHeight() {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  async function sendQuestion(question: string) {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || isAsking) {
      return;
    }

    setInputValue('');
    setChatError('');
    setLastFailedQuestion('');
    setIsAsking(true);
    resetTextareaHeight();

    const userMessage: ChatMessage = {
      role: 'user',
      content: trimmedQuestion,
    };

    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: '',
    };

    setMessages((previous) => [
      ...previous,
      userMessage,
      assistantMessage,
    ]);

    try {
      const sources = await streamQuestion(
        trimmedQuestion,
        document.document_id,
        (chunk: string) => {
          setMessages((previous) => {
            const updated = [...previous];
            const lastMessage = updated[updated.length - 1];

            if (lastMessage?.role === 'assistant') {
              // Special sentinel: replace the full content instead of appending
              if (chunk.startsWith('\x00REPLACE\x00')) {
                updated[updated.length - 1] = {
                  ...lastMessage,
                  content: chunk.slice('\x00REPLACE\x00'.length),
                };
              } else {
                updated[updated.length - 1] = {
                  ...lastMessage,
                  content: lastMessage.content + chunk,
                };
              }
            }

            return updated;
          });
        },
      );

      // Attach parsed sources to the last assistant message
      if (sources.length > 0) {
        setMessages((previous) => {
          const updated = [...previous];
          const lastMessage = updated[updated.length - 1];
          if (lastMessage?.role === 'assistant') {
            updated[updated.length - 1] = { ...lastMessage, sources };
          }
          return updated;
        });
      }
    } catch (error: unknown) {
      setMessages((previous) => previous.slice(0, -2));
      setLastFailedQuestion(trimmedQuestion);

      if (axios.isAxiosError(error)) {
        setChatError(
          error.response?.data?.detail ||
            error.response?.data?.message ||
            'Unable to get an answer. Please try again.',
        );
      } else if (error instanceof Error) {
        setChatError(error.message);
      } else {
        setChatError('Something went wrong. Please try again.');
      }
    } finally {
      setIsAsking(false);
      textareaRef.current?.focus();
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendQuestion(inputValue);
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      void sendQuestion(inputValue);
    }
  }

  function handleInputChange(
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ) {
    setInputValue(event.target.value);

    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }

  function handleRetry() {
    if (lastFailedQuestion) {
      void sendQuestion(lastFailedQuestion);
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F8F8FC] text-[#22233A]">
      <Navbar fluid userEmail={userEmail} onSignOut={onSignOut} />

      <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col px-3 sm:px-6">
        {/* Page Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-gray-200/80 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="rounded-xl p-2 transition hover:bg-gray-200/60 active:scale-95 text-[#22233A] cursor-pointer"
              aria-label="Back to documents"
              title="Back to library"
            >
              <ArrowLeft size={19} />
            </button>

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#635BFF]/10 text-[#635BFF]">
              <FileText size={18} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold sm:text-base text-[#22233A]">
                {document.filename}
              </h1>

              <p className="text-xs text-gray-500 flex items-center gap-1.5">
                <span>
                  {document.page_count != null
                    ? `${document.page_count} pages`
                    : 'PDF document'}
                </span>
                {document.status && (
                  <>
                    <span>·</span>
                    <span className="capitalize">{document.status}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Mobile view toggle (PDF vs Chat) */}
          <div className="flex items-center gap-1 rounded-xl bg-gray-200/80 p-1 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileTab('pdf')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                mobileTab === 'pdf'
                  ? 'bg-white text-[#22233A] shadow-xs'
                  : 'text-gray-600 hover:text-[#22233A]'
              }`}
            >
              <FileText size={13} />
              PDF
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('chat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                mobileTab === 'chat'
                  ? 'bg-white text-[#22233A] shadow-xs'
                  : 'text-gray-600 hover:text-[#22233A]'
              }`}
            >
              <Sparkles size={13} />
              Chat
              {messages.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-[#635BFF] text-white text-[10px]">
                  {messages.length}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* PDF viewer + Chat Split / Responsive View */}
        <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden py-3 sm:py-4 lg:grid-cols-2">
          {/* Left: PDF Viewer Container */}
          <section
            className={`min-h-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs flex flex-col ${
              mobileTab === 'chat' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            <PDFViewer
              documentId={document.document_id}
              pageNumber={selectedPage}
              highlightPage={activeHighlight?.page}
              highlightText={activeHighlight?.text}
            />
          </section>

          {/* Right: Contained Chat with Sticky Input */}
          <section
            className={`min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs relative ${
              mobileTab === 'pdf' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* ── Chat Container Header ── */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-white px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#635BFF]/10 text-[#635BFF]">
                  <Sparkles size={14} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-[#22233A]">AI Chat Assistant</h2>
                  <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Grounded in document context
                  </p>
                </div>
              </div>

              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setMessages([]);
                    setChatError('');
                  }}
                  className="text-xs text-gray-400 hover:text-red-500 px-2.5 py-1 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
                  title="Clear conversation"
                >
                  Clear chat
                </button>
              )}
            </div>

            {/* ── Scrollable Messages Container (scrolls within container) ── */}
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5 custom-scrollbar bg-[#FBFBFE]">
              {messages.length === 0 ? (
                <div className="flex min-h-full flex-col items-center justify-center px-4 py-8 text-center my-auto">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#635BFF]/10 text-[#635BFF] animate-float shadow-inner">
                    <BookOpen size={26} />
                  </div>

                  <h3 className="text-lg sm:text-xl font-semibold text-[#22233A]">
                    Chat with your document
                  </h3>

                  <p className="mt-1.5 max-w-sm text-xs sm:text-sm leading-relaxed text-gray-500">
                    Ask questions, summarize key sections, or find answers directly cited from your PDF.
                  </p>

                  <div className="mt-6 w-full max-w-md space-y-2">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-left pl-1">
                      Suggested questions
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {SUGGESTED_QUESTIONS.map((question) => (
                        <button
                          key={question}
                          type="button"
                          disabled={isAsking}
                          onClick={() => void sendQuestion(question)}
                          className="group flex items-center justify-between text-left rounded-xl border border-gray-200 bg-white p-3 text-xs font-medium text-[#22233A]
                                     hover:border-[#635BFF]/40 hover:bg-[#635BFF]/5 hover:shadow-xs transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                        >
                          <span className="truncate pr-1">{question}</span>
                          <span className="text-gray-300 group-hover:text-[#635BFF] group-hover:translate-x-0.5 transition-all text-sm shrink-0">→</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((message, index) => {
                  const isUser = message.role === 'user';
                  const isLastAssistant =
                    message.role === 'assistant' &&
                    index === messages.length - 1;

                  return (
                    <div
                      key={`${index}-${message.role}`}
                      className={`flex animate-fade-slide-up ${
                        isUser ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[92%] sm:max-w-[85%] rounded-2xl px-4 py-3.5 text-sm leading-relaxed ${
                          isUser
                            ? 'rounded-br-sm bg-[#635BFF] text-white shadow-[0_2px_8px_rgba(99,91,255,0.25)]'
                            : 'rounded-tl-sm border border-gray-200/80 bg-white shadow-xs text-[#22233A]'
                        }`}
                      >
                        {!isUser && (
                          <div className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-[#635BFF]">
                            <Sparkles size={13} />
                            <span>DocuMind</span>
                          </div>
                        )}

                        {isUser ? (
                          <p className="whitespace-pre-wrap">
                            {message.content}
                          </p>
                        ) : message.content ? (
                          <div className="break-words">
                            <AnswerRenderer text={message.content} />
                          </div>
                        ) : isAsking && isLastAssistant ? (
                          <TypingIndicator />
                        ) : null}

                        {/* Source page citations — clicking scrolls the PDF and highlights text */}
                        {!isUser &&
                          Array.isArray(message.sources) &&
                          message.sources.length > 0 && (
                            <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
                              <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1">
                                <BookOpen size={12} /> Sources:
                              </span>
                              {message.sources.map((source, sourceIndex) => (
                                <button
                                  key={sourceIndex}
                                  type="button"
                                  onClick={() => {
                                    setSelectedPage(source.page_number);
                                    setActiveHighlight({
                                      page: source.page_number,
                                      text: source.chunk_text ?? '',
                                    });
                                    setMobileTab('pdf');
                                  }}
                                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-[#635BFF]/10 px-2.5 py-1 text-xs font-medium text-[#635BFF]
                                             border border-[#635BFF]/20 transition-all duration-150
                                             hover:bg-[#635BFF] hover:text-white hover:border-[#635BFF] hover:shadow-[0_2px_6px_rgba(99,91,255,0.25)]
                                             active:scale-95"
                                  title={`Jump to Page ${source.page_number} in PDF`}
                                >
                                  <span>Page {source.page_number}</span>
                                  <span className="text-[10px] opacity-70">↗</span>
                                </button>
                              ))}
                            </div>
                          )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Error and retry */}
              {chatError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle
                      size={18}
                      className="mt-0.5 shrink-0 text-red-600"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-red-700">{chatError}</p>

                      {lastFailedQuestion && (
                        <button
                          type="button"
                          onClick={handleRetry}
                          disabled={isAsking}
                          className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-red-700 hover:text-red-900 disabled:opacity-50 cursor-pointer"
                        >
                          <RefreshCw size={14} />
                          Retry
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} className="h-1" />
            </div>

            {/* ── Sticky Typing Message Input (docked at container bottom) ── */}
            <div className="shrink-0 border-t border-gray-100 bg-white/95 backdrop-blur-sm p-3.5 sm:p-4 z-10 shadow-[0_-4px_16px_rgba(0,0,0,0.02)]">
              <form
                onSubmit={handleSubmit}
                className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-[#FAFAFC] p-2 transition-all duration-150
                           focus-within:border-[#635BFF]/60 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(99,91,255,0.12)]"
              >
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question about your PDF..."
                  rows={1}
                  disabled={isAsking}
                  className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-[#22233A] outline-none placeholder:text-gray-400 disabled:cursor-not-allowed"
                />

                <button
                  type="submit"
                  disabled={!inputValue.trim() || isAsking}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#635BFF] text-white transition-all
                             hover:bg-[#5148E5] hover:shadow-[0_2px_8px_rgba(99,91,255,0.3)] active:scale-95
                             disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-none cursor-pointer"
                  aria-label="Send question"
                  title="Send question (Enter)"
                >
                  {isAsking ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </form>

              <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400 px-1">
                <span>
                  Press <kbd className="px-1 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-600 font-mono text-[10px]">Enter ↵</kbd> to send · <kbd className="px-1 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-600 font-mono text-[10px]">Shift + Enter</kbd> for newline
                </span>
                {inputValue.length > 0 && (
                  <span className="font-mono text-[10px] text-gray-400">
                    {inputValue.length} chars
                  </span>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
