import type { Source } from "@/lib/types";

interface SourceCitationProps {
  source: Source;
}

export function SourceCitation({ source }: SourceCitationProps): React.ReactElement {
  return (
    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-slate-700">{source.document_name}</span>
        {source.page_number && (
          <span className="text-sm text-slate-500">Page {source.page_number}</span>
        )}
      </div>
      <p className="text-sm text-slate-600 line-clamp-2">{source.excerpt}</p>
      <div className="mt-2">
        <span className="text-xs text-slate-400">
          Relevance: {(source.similarity_score * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );
}



