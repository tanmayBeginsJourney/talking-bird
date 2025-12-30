import { SourceCitation } from "./SourceCitation";
import type { QueryResponse } from "@/lib/types";

interface AnswerDisplayProps {
  response: QueryResponse;
}

const confidenceBadgeStyles = {
  high: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-red-100 text-red-800",
};

export function AnswerDisplay({ response }: AnswerDisplayProps): React.ReactElement {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-medium text-slate-500">Answer</span>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${confidenceBadgeStyles[response.confidence]}`}
        >
          {response.confidence} confidence
        </span>
      </div>

      <p className="text-slate-800 leading-relaxed mb-6">{response.answer}</p>

      {response.sources.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-500 mb-3">Sources</h3>
          <div className="space-y-3">
            {response.sources.map((source, index) => (
              <SourceCitation key={index} source={source} />
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400 mt-4">
        Response time: {response.processing_time_ms}ms
      </p>
    </div>
  );
}



