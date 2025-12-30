"use client";

import { useState } from "react";
import { SourceCitation } from "./SourceCitation";
import type { QueryResponse } from "@/lib/types";

interface AnswerDisplayProps {
  response: QueryResponse;
}

const confidenceConfig = {
  high: { 
    bg: "#DCFCE7", 
    text: "#166534", 
    label: "High confidence" 
  },
  medium: { 
    bg: "#FEF3C7", 
    text: "#92400E", 
    label: "Medium confidence" 
  },
  low: { 
    bg: "#FEE2E2", 
    text: "#991B1B", 
    label: "Low confidence" 
  },
};

export function AnswerDisplay({ response }: AnswerDisplayProps): React.ReactElement {
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const confidence = confidenceConfig[response.confidence];

  return (
    <div 
      className="rounded-xl p-6 animate-fade-in"
      style={{ 
        background: "var(--card)", 
        border: "1px solid var(--border)" 
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span 
          className="text-sm font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          Answer
        </span>
        <span
          className="px-3 py-1 rounded-full text-xs font-medium"
          style={{ 
            background: confidence.bg, 
            color: confidence.text 
          }}
        >
          {confidence.label}
        </span>
      </div>

      {/* Answer Text */}
      <p 
        className="text-lg leading-relaxed mb-6"
        style={{ color: "var(--text-primary)" }}
      >
        {response.answer}
      </p>

      {/* Sources Section */}
      {response.sources.length > 0 && (
        <div 
          className="pt-4"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <button
            onClick={() => setSourcesExpanded(!sourcesExpanded)}
            className="flex items-center gap-2 w-full text-left group"
          >
            <span 
              className="text-sm font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Sources ({response.sources.length})
            </span>
            <svg 
              className={`w-4 h-4 transition-transform ${sourcesExpanded ? "rotate-180" : ""}`}
              style={{ color: "var(--text-secondary)" }}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {sourcesExpanded && (
            <div className="mt-4 space-y-3 animate-fade-in">
              {response.sources.map((source, index) => (
                <SourceCitation key={index} source={source} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <p 
        className="text-xs mt-6"
        style={{ color: "var(--text-secondary)" }}
      >
        Response time: {response.processing_time_ms}ms
      </p>
    </div>
  );
}
