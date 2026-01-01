"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Loader2, Download } from "lucide-react";
import { sendQuery } from "@/lib/api";
import type { QueryResponse, SourceResponse, GroupedSource } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DownloadModal } from "./DownloadModal";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceResponse[];
  confidence?: "high" | "medium" | "low";
  timestamp: Date;
}

// Helper function to group sources by document
function groupSourcesByDocument(sources: SourceResponse[]): GroupedSource[] {
  const grouped = new Map<string, GroupedSource>();

  for (const source of sources) {
    const existing = grouped.get(source.document_id);
    if (existing) {
      if (!existing.pages.includes(source.page_number)) {
        existing.pages.push(source.page_number);
      }
      existing.excerpts.push({
        page: source.page_number,
        excerpt: source.excerpt,
        similarity_score: source.similarity_score,
      });
      // Recalculate average
      existing.avg_similarity_score =
        existing.excerpts.reduce((sum, e) => sum + e.similarity_score, 0) /
        existing.excerpts.length;
    } else {
      grouped.set(source.document_id, {
        document_id: source.document_id,
        document_name: source.document_name,
        pages: [source.page_number],
        excerpts: [
          {
            page: source.page_number,
            excerpt: source.excerpt,
            similarity_score: source.similarity_score,
          },
        ],
        avg_similarity_score: source.similarity_score,
      });
    }
  }

  // Sort pages within each group
  for (const group of grouped.values()) {
    group.pages.sort((a, b) => (a ?? 0) - (b ?? 0));
    group.excerpts.sort((a, b) => (a.page ?? 0) - (b.page ?? 0));
  }

  return Array.from(grouped.values());
}

const starterQuestions = [
  "What are the admission dates?",
  "Tell me about the TLP program",
  "What research programs are available?",
];

const confidenceColors = {
  high: "bg-green-100 text-green-700 border-green-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-red-100 text-red-700 border-red-200",
};

export function ChatInterface(): React.ReactElement {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroupedSource, setSelectedGroupedSource] = useState<GroupedSource | null>(null);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSourceClick = (groupedSource: GroupedSource) => {
    setSelectedGroupedSource(groupedSource);
    setIsDownloadModalOpen(true);
  };

  const handleCloseDownloadModal = () => {
    setIsDownloadModalOpen(false);
    setSelectedGroupedSource(null);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const response: QueryResponse = await sendQuery(userMessage.content);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.answer,
        sources: response.sources,
        confidence: response.confidence,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to get response";
      setError(errorMessage);
      
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Sorry, I encountered an error: ${errorMessage}`,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStarterQuestion = async (question: string) => {
    setInput(question);
    // Trigger submit after a brief delay to allow input to update
    setTimeout(() => {
      const form = document.querySelector("form");
      if (form) {
        form.requestSubmit();
      }
    }, 0);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {!hasMessages ? (
          // Hero Mode - Welcome Screen
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center px-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
              className="mb-8"
            >
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                <Bot className="w-10 h-10 text-slate-600" />
              </div>
              <h2 className="text-3xl font-bold text-slate-800 mb-3">
                Welcome to Plaksha AI
              </h2>
              <p className="text-slate-600 text-lg mb-8 max-w-md">
                Your intelligent university guide. Ask me anything about admissions, programs, and more.
              </p>
            </motion.div>

            <div className="space-y-3 w-full max-w-md">
              <p className="text-sm font-medium text-slate-500 mb-4">Try asking:</p>
              {starterQuestions.map((question, index) => (
                <motion.button
                  key={question}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  onClick={() => handleStarterQuestion(question)}
                  className="w-full px-6 py-4 text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all duration-200 hover:shadow-md hover:border-slate-300 group"
                >
                  <span className="text-slate-700 group-hover:text-slate-900 font-medium">
                    {question}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          // Chat Mode - Message History
          <>
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="w-5 h-5 text-slate-600" />
                    </div>
                  )}
                  
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-3",
                      message.role === "user"
                        ? "bg-slate-800 text-white"
                        : "bg-slate-50 text-slate-800 border border-slate-200"
                    )}
                  >
                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                    
                    {message.role === "assistant" && message.sources && message.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <div className="flex flex-wrap gap-2 mb-2">
                          {groupSourcesByDocument(message.sources).map((groupedSource) => {
                            const pageNumbers = groupedSource.pages
                              .filter((p): p is number => p !== null)
                              .sort((a, b) => a - b);
                            const pagesDisplay = pageNumbers.length > 0
                              ? ` (p.${pageNumbers.join(", ")})`
                              : "";
                            
                            return (
                              <motion.button
                                key={groupedSource.document_id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleSourceClick(groupedSource)}
                                className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-full text-slate-700 hover:bg-slate-100 hover:border-slate-400 transition-colors flex items-center gap-1.5 group"
                                title={`Click to download: ${groupedSource.document_name}${pagesDisplay}`}
                              >
                                <Download className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors" />
                                {groupedSource.document_name}
                                {pagesDisplay}
                              </motion.button>
                            );
                          })}
                        </div>
                        {message.confidence && (
                          <span
                            className={cn(
                              "inline-block px-2 py-0.5 text-xs font-medium rounded-full border",
                              confidenceColors[message.confidence]
                            )}
                          >
                            {message.confidence} confidence
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {message.role === "user" && (
                    <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Loading Indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 justify-start"
              >
                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-5 h-5 text-slate-600" />
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-medium">Thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Bar - Sticky at bottom */}
      <div className="border-t border-slate-200 bg-white p-4">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about Plaksha University..."
            className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent text-slate-800 placeholder:text-slate-400"
            maxLength={500}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="hidden sm:inline">Sending...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </>
            )}
          </button>
        </form>
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 text-sm text-red-600"
          >
            {error}
          </motion.p>
        )}
      </div>

      {/* Download Modal */}
      <DownloadModal
        groupedSource={selectedGroupedSource}
        isOpen={isDownloadModalOpen}
        onClose={handleCloseDownloadModal}
      />
    </div>
  );
}

