"use client";

import { useState, useEffect, useMemo } from "react";
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

// Format citations: [1], [2] -> superscript, remove commas between successive
function formatAnswerWithCitations(text: string): React.ReactNode[] {
  // First, clean up comma-separated citations like [1], [2] -> [1][2]
  const cleaned = text.replace(/\](\s*),(\s*)\[/g, "][");
  
  // Split by citation pattern and create elements
  const parts = cleaned.split(/(\[\d+\])/g);
  
  return parts.map((part, i) => {
    // Check if this is a citation
    const citationMatch = part.match(/^\[(\d+)\]$/);
    if (citationMatch) {
      return (
        <sup 
          key={i} 
          className="text-xs font-medium ml-0.5"
          style={{ color: "var(--accent)" }}
        >
          [{citationMatch[1]}]
        </sup>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function AnswerDisplay({ response }: AnswerDisplayProps): React.ReactElement {
  const [showSources, setShowSources] = useState(false);
  const [displayedWords, setDisplayedWords] = useState(0);
  const [isStreaming, setIsStreaming] = useState(true);
  const confidence = confidenceConfig[response.confidence];

  // Split answer into words for streaming
  const words = useMemo(() => response.answer.split(/(\s+)/), [response.answer]);
  
  // Stream words effect
  useEffect(() => {
    if (displayedWords >= words.length) {
      setIsStreaming(false);
      return;
    }

    // Fast streaming: ~30ms per word (roughly 400 WPM reading speed)
    const timer = setTimeout(() => {
      // Show multiple words at once for speed (3-4 words per tick)
      setDisplayedWords(prev => Math.min(prev + 3, words.length));
    }, 25);

    return () => clearTimeout(timer);
  }, [displayedWords, words.length]);

  // Reset streaming when response changes
  useEffect(() => {
    setDisplayedWords(0);
    setIsStreaming(true);
  }, [response.answer]);

  // Get currently visible text
  const visibleText = words.slice(0, displayedWords).join("");
  const formattedAnswer = formatAnswerWithCitations(visibleText);

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

        {/* Answer Text with streaming */}
        <div 
          className="text-xl leading-relaxed font-light"
          style={{ color: "var(--text-primary)" }}
        >
          {formattedAnswer}
          {isStreaming && (
            <span 
              className="inline-block w-0.5 h-5 ml-1 animate-pulse"
              style={{ background: "var(--accent)" }}
            />
          )}
        </div>

        {/* Meta - only show when done streaming */}
        {!isStreaming && (
          <div 
            className="mt-6 pt-6 flex items-center justify-between animate-fade-in"
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
        )}
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
