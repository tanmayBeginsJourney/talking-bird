/**
 * Type definitions matching backend API schemas
 */

export type ConfidenceLevel = "high" | "medium" | "low";

export interface SourceResponse {
  document_id: string;
  document_name: string;
  page_number: number | null;
  excerpt: string;
  similarity_score: number;
}

// Alias for Source (used in SourceCitation component)
export type Source = SourceResponse;

export interface QueryRequest {
  query: string;
  max_chunks?: number;
}

export interface QueryResponse {
  answer: string;
  confidence: ConfidenceLevel;
  sources: SourceResponse[];
  processing_time_ms: number;
}

