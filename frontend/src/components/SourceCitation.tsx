"use client";

import { api } from "@/lib/api";
import type { Source } from "@/lib/types";

interface SourceCitationProps {
  source: Source;
  index: number;
}

export function SourceCitation({ source, index }: SourceCitationProps): React.ReactElement {
  const relevance = Math.round(source.similarity_score * 100);
  const downloadUrl = api.getDocumentDownloadUrl(source.document_id);

  // Determine relevance color
  const relevanceColor = relevance >= 75 
    ? "var(--success)" 
    : relevance >= 65 
      ? "var(--warning)" 
      : "var(--text-tertiary)";

  return (
    <div 
      className="group rounded-xl p-4 transition-colors"
      style={{ 
        background: "var(--bg-secondary)",
      }}
    >
      <div className="flex items-start gap-4">
        {/* Index */}
        <span 
          className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs font-mono"
          style={{ 
            background: "var(--bg-elevated)", 
            color: "var(--text-secondary)" 
          }}
        >
          {index}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium truncate transition-colors hover:underline"
              style={{ color: "var(--text-primary)" }}
              title={`Download ${source.document_name}`}
            >
              {source.document_name}
            </a>
            
            {source.page_number && (
              <span 
                className="flex-shrink-0 text-xs px-2 py-0.5 rounded"
                style={{ 
                  background: "var(--bg-elevated)", 
                  color: "var(--text-secondary)" 
                }}
              >
                p.{source.page_number}
              </span>
            )}

            <span 
              className="flex-shrink-0 text-xs font-mono"
              style={{ color: relevanceColor }}
            >
              {relevance}%
            </span>
          </div>

          {/* Excerpt */}
          <p 
            className="text-sm leading-relaxed line-clamp-3"
            style={{ color: "var(--text-secondary)" }}
          >
            {source.excerpt}
          </p>
        </div>
      </div>
    </div>
  );
}
