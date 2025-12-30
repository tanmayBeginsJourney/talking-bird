"use client";

import { useState } from "react";
import { AnswerDisplay } from "./AnswerDisplay";
import type { QueryResponse } from "@/lib/types";

export function QueryInterface(): React.ReactElement {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<QueryResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      // API call will be implemented here
      setResponse(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e): void => setQuery(e.target.value)}
            placeholder="Ask a question about Office of Research policies..."
            className="flex-1 px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Searching..." : "Ask"}
          </button>
        </div>
      </form>

      {response && <AnswerDisplay response={response} />}
    </div>
  );
}



