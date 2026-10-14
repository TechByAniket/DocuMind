
import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Send,
  Loader2,
  FileText,
  AlertCircle,
  RefreshCw,
  BookOpen,
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
}

const SUGGESTED_QUESTIONS = [
  'Summarize this document',
  'What are the key points?',
  'Explain the main concepts',
  'What are the important conclusions?',
];

export default function ChatPage({ document, onBack }: ChatPageProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [chatError, setChatError] = useState('');
  const [lastFailedQuestion, setLastFailedQuestion] = useState('');

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
      await streamQuestion(
        trimmedQuestion,
        document.document_id,
        (chunk: string) => {
          setMessages((previous) => {
            const updated = [...previous];
            const lastMessage = updated[updated.length - 1];

            if (lastMessage?.role === 'assistant') {
              updated[updated.length - 1] = {
                ...lastMessage,
                content: lastMessage.content + chunk,
              };
            }

            return updated;
          });
        },
      );
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
      <Navbar />

      <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col px-4 sm:px-6">
        {/* Header */}
        <header className="flex shrink-0 items-center gap-3 border-b border-gray-200 py-4">
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl p-2 transition hover:bg-gray-100"
            aria-label="Back to documents"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#635BFF]/10">
              <FileText size={20} className="text-[#635BFF]" />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold sm:text-base">
                {document.filename}
              </h1>

              <p className="text-xs text-gray-500">
                {document.page_count != null
                  ? `${document.page_count} pages`
                  : 'PDF document'}
                {document.status ? ` · ${document.status}` : ''}
              </p>
            </div>
          </div>
        </header>

        {/* PDF viewer + Chat */}
        <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden py-4 lg:grid-cols-2">
          {/* Left: PDF Viewer */}
          <section className="min-h-0 overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <PDFViewer documentId={document.document_id} />
          </section>

          {/* Right: Chat */}
          <section className="mx-auto flex min-h-0 w-full max-w-3xl flex-col overflow-hidden lg:mx-0 lg:max-w-none">
            {/* Messages */}
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto py-6">
              {messages.length === 0 ? (
                <div className="flex min-h-full flex-col items-center justify-center px-4 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#635BFF]/10">
                    <BookOpen size={27} className="text-[#635BFF]" />
                  </div>

                  <h2 className="text-xl font-semibold">
                    Chat with your PDF
                  </h2>

                  <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-500">
                    Ask questions about your document, summarize sections,
                    or explore important concepts.
                  </p>

                  <div className="mt-6 flex max-w-xl flex-wrap justify-center gap-2">
                    {SUGGESTED_QUESTIONS.map((question) => (
                      <button
                        key={question}
                        type="button"
                        disabled={isAsking}
                        onClick={() => void sendQuestion(question)}
                        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm transition hover:border-[#635BFF]/40 hover:bg-[#635BFF]/5 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {question}
                      </button>
                    ))}
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
                      className={`flex ${
                        isUser ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[95%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[90%] ${
                          isUser
                            ? 'rounded-br-md bg-[#635BFF] text-white'
                            : 'rounded-bl-md border border-gray-100 bg-white shadow-sm'
                        }`}
                      >
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

                        {/* Source page references */}
                        {!isUser &&
                          'sources' in message &&
                          Array.isArray(message.sources) &&
                          message.sources.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                              {[
                                ...new Set(
                                  message.sources
                                    .map((source) =>
                                      typeof source === 'number'
                                        ? source
                                        : source.page_number,
                                    )
                                    .filter(
                                      (page): page is number =>
                                        typeof page === 'number',
                                    ),
                                ),
                              ].map((page) => (
                                <span
                                  key={page}
                                  className="rounded-lg bg-[#635BFF]/10 px-2 py-1 text-xs font-medium text-[#635BFF]"
                                >
                                  Page {page}
                                </span>
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
                          className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-red-700 hover:text-red-900 disabled:opacity-50"
                        >
                          <RefreshCw size={14} />
                          Retry
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Composer */}
            <div className="shrink-0 border-t border-gray-200 bg-[#F8F8FC] py-4">
              <form
                onSubmit={handleSubmit}
                className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm focus-within:border-[#635BFF]/50"
              >
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question about your PDF..."
                  rows={1}
                  disabled={isAsking}
                  className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-gray-400 disabled:cursor-not-allowed"
                />

                <button
                  type="submit"
                  disabled={!inputValue.trim() || isAsking}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#635BFF] text-white transition hover:bg-[#5148E5] disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Send question"
                >
                  {isAsking ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </form>

              <p className="mt-2 text-center text-xs text-gray-400">
                Enter to send · Shift + Enter for a new line
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
