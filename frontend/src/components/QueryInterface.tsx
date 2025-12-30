"use client";

import { useState, useCallback } from "react";
import { AnswerDisplay } from "./AnswerDisplay";
import { api } from "@/lib/api";
import type { QueryResponse } from "@/lib/types";

export function QueryInterface(): React.ReactElement {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const result = await api.submitQuery({ query: query.trim() });
      setResponse(result);
    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error("Query failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [query, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      void handleSubmit(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Query Form */}
      <form onSubmit={(e) => void handleSubmit(e)}>
        <div 
          className="rounded-2xl p-2 shadow-sm"
          style={{ 
            background: "var(--card)", 
            border: "1px solid var(--border)" 
          }}
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about the documents..."
              className="flex-1 px-4 py-4 text-lg bg-transparent border-none focus:outline-none"
              style={{ color: "var(--text-primary)" }}
              maxLength={500}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="px-8 py-4 rounded-xl font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
              style={{ 
                background: isLoading ? "var(--text-secondary)" : "var(--accent)",
              }}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle 
                      className="opacity-25" 
                      cx="12" cy="12" r="10" 
                      stroke="currentColor" 
                      strokeWidth="4"
                      fill="none"
                    />
                    <path 
                      className="opacity-75" 
                      fill="currentColor" 
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Searching
                </span>
              ) : "Ask"}
            </button>
          </div>
        </div>
        <p 
          className="text-xs mt-2 text-center"
          style={{ color: "var(--text-secondary)" }}
        >
          Press ⌘+Enter to submit
        </p>
      </form>

      {/* Loading Skeleton */}
      {isLoading && (
        <div 
          className="rounded-xl p-6 animate-fade-in"
          style={{ 
            background: "var(--card)", 
            border: "1px solid var(--border)" 
          }}
        >
          <div className="space-y-4">
            <div className="h-4 w-24 rounded skeleton" />
            <div className="space-y-2">
              <div className="h-4 w-full rounded skeleton" />
              <div className="h-4 w-full rounded skeleton" />
              <div className="h-4 w-3/4 rounded skeleton" />
            </div>
            <div className="pt-4 space-y-2">
              <div className="h-3 w-20 rounded skeleton" />
              <div className="h-16 w-full rounded skeleton" />
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div 
          className="rounded-xl p-6 text-center animate-fade-in"
          style={{ 
            background: "var(--card)", 
            border: "1px solid var(--error)" 
          }}
        >
          <p style={{ color: "var(--error)" }} className="font-medium">
            {error}
          </p>
        </div>
      )}

      {/* Answer */}
      {response && !isLoading && (
        <AnswerDisplay response={response} />
      )}
    </div>
  );
}
