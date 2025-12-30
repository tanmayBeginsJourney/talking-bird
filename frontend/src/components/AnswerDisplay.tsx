"use client";

import { useState } from "react";
import { SourceCitation } from "./SourceCitation";
import type { QueryResponse } from "@/lib/types";

interface AnswerDisplayProps {
  response: QueryResponse;
}

const confidenceConfig = {
  high: { 
    color: "var(--success)", 
    bg: "rgba(52, 211, 153, 0.1)",
    label: "High confidence" 
  },
  medium: { 
    color: "var(--warning)", 
    bg: "rgba(251, 191, 36, 0.1)",
    label: "Medium confidence" 
  },
  low: { 
    color: "var(--error)", 
    bg: "rgba(248, 113, 113, 0.1)",
    label: "Low confidence" 
  },
};

export function AnswerDisplay({ response }: AnswerDisplayProps): React.ReactElement {
  const [showSources, setShowSources] = useState(false);
  const confidence = confidenceConfig[response.confidence];

  // Clean up answer - remove inline citations for cleaner display
  const cleanAnswer = response.answer
    .replace(/\[([^\]]+\.pdf)[^\]]*\]/g, "") // Remove [filename.pdf, Page X]
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();

  return (
    <div className="animate-slide-up space-y-4">
      {/* Answer Card */}
      <div 
        className="rounded-2xl p-8"
        style={{ 
          background: "var(--bg-secondary)", 
          border: "1px solid var(--border)" 
        }}
      >
        {/* Confidence Badge */}
        <div className="flex items-center justify-between mb-6">
          <span 
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color: "var(--text-tertiary)" }}
          >
            Answer
          </span>
          <span
            className="px-3 py-1 rounded-full text-xs font-medium"
            style={{ 
              background: confidence.bg, 
              color: confidence.color 
            }}
          >
            {confidence.label}
          </span>
        </div>

        {/* Answer Text */}
        <p 
          className="text-xl leading-relaxed font-light"
          style={{ color: "var(--text-primary)" }}
        >
          {cleanAnswer}
        </p>

        {/* Meta */}
        <div 
          className="mt-6 pt-6 flex items-center justify-between"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          <span 
            className="text-xs"
            style={{ color: "var(--text-tertiary)" }}
          >
            {response.processing_time_ms}ms
          </span>
          
          {response.sources.length > 0 && (
            <button
              onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-2 text-sm font-medium transition-colors"
              style={{ color: "var(--accent)" }}
              onMouseEnter={(e) => e.currentTarget.style.color = "var(--accent-hover)"}
              onMouseLeave={(e) => e.currentTarget.style.color = "var(--accent)"}
            >
              <span>{showSources ? "Hide" : "View"} {response.sources.length} sources</span>
              <svg 
                className={`w-4 h-4 transition-transform duration-200 ${showSources ? "rotate-180" : ""}`}
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Sources Panel */}
      {showSources && response.sources.length > 0 && (
        <div 
          className="rounded-2xl p-6 animate-fade-in"
          style={{ 
            background: "var(--bg-tertiary)", 
            border: "1px solid var(--border-subtle)" 
          }}
        >
          <h3 
            className="text-xs font-medium uppercase tracking-wider mb-4"
            style={{ color: "var(--text-tertiary)" }}
          >
            Sources
          </h3>
          <div className="space-y-3">
            {response.sources.map((source, index) => (
              <SourceCitation key={index} source={source} index={index + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
