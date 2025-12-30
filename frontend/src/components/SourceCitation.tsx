"use client";

import { useState } from "react";
import type { Source } from "@/lib/types";

interface SourceCitationProps {
  source: Source;
}

const fileTypeIcons: Record<string, string> = {
  pdf: "📄",
  docx: "📝",
  txt: "📃",
  default: "📎",
};

export function SourceCitation({ source }: SourceCitationProps): React.ReactElement {
  const [expanded, setExpanded] = useState(false);
  
  // Extract file extension from filename
  const extension = source.document_name.split(".").pop()?.toLowerCase() ?? "default";
  const icon = fileTypeIcons[extension] ?? fileTypeIcons.default;
  
  // Relevance percentage
  const relevance = Math.round(source.similarity_score * 100);

  return (
    <div 
      className="rounded-lg p-4"
      style={{ 
        background: "var(--background)", 
        border: "1px solid var(--border)" 
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg flex-shrink-0">{icon}</span>
          <span 
            className="font-medium truncate"
            style={{ color: "var(--text-primary)" }}
            title={source.document_name}
          >
            {source.document_name}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {source.page_number && (
            <span 
              className="text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              Page {source.page_number}
            </span>
          )}
        </div>
      </div>

      {/* Excerpt */}
      <div className="mt-3">
        <p 
          className={`text-sm leading-relaxed ${expanded ? "" : "line-clamp-2"}`}
          style={{ color: "var(--text-secondary)" }}
        >
          {source.excerpt}
        </p>
        {source.excerpt.length > 120 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm font-medium mt-1 hover:opacity-70"
            style={{ color: "var(--accent)" }}
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>

      {/* Relevance Bar */}
      <div className="mt-3 flex items-center gap-2">
        <span 
          className="text-xs"
          style={{ color: "var(--text-secondary)" }}
        >
          Relevance
        </span>
        <div 
          className="flex-1 h-1.5 rounded-full overflow-hidden"
          style={{ background: "var(--border)" }}
        >
          <div 
            className="h-full rounded-full transition-all"
            style={{ 
              width: `${relevance}%`,
              background: relevance >= 75 
                ? "var(--success)" 
                : relevance >= 65 
                  ? "var(--warning)" 
                  : "var(--text-secondary)"
            }}
          />
        </div>
        <span 
          className="text-xs tabular-nums"
          style={{ color: "var(--text-secondary)" }}
        >
          {relevance}%
        </span>
      </div>
    </div>
  );
}
