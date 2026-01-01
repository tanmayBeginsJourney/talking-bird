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
      setError("Failed to get response. Please try again.");
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
    <div className="space-y-8">
      {/* Search Input */}
      <form onSubmit={(e) => void handleSubmit(e)}>
        <div 
          className="relative rounded-2xl overflow-hidden"
          style={{ 
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
          }}
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What would you like to know?"
            className="w-full px-6 py-5 text-lg bg-transparent border-none focus:outline-none placeholder:opacity-40"
            style={{ color: "var(--text-primary)" }}
            maxLength={500}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 px-5 py-2.5 rounded-xl font-medium text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
            style={{ 
              background: "var(--accent)",
            }}
            onMouseEnter={(e) => {
              if (!isLoading && query.trim()) {
                e.currentTarget.style.background = "var(--accent-hover)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--accent)";
            }}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Searching</span>
              </span>
            ) : "Ask"}
          </button>
        </div>
        <p 
          className="text-xs mt-3 text-center"
          style={{ color: "var(--text-tertiary)" }}
        >
          ⌘ + Enter to submit
        </p>
      </form>

      {/* Loading State */}
      {isLoading && (
        <div 
          className="rounded-2xl p-8 animate-fade-in"
          style={{ 
            background: "var(--bg-secondary)", 
            border: "1px solid var(--border)" 
          }}
        >
          <div className="space-y-4">
            <div className="skeleton h-3 w-32" />
            <div className="space-y-2 pt-2">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-4/5" />
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div 
          className="rounded-2xl p-6 text-center animate-fade-in"
          style={{ 
            background: "var(--bg-secondary)", 
            border: "1px solid rgba(248, 113, 113, 0.3)" 
          }}
        >
          <p style={{ color: "var(--error)" }}>
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
