"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, FileText, Loader2, BookOpen } from "lucide-react";
import { downloadDocument } from "@/lib/api";
import type { GroupedSource } from "@/lib/types";

interface DownloadModalProps {
  groupedSource: GroupedSource | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DownloadModal({ groupedSource, isOpen, onClose }: DownloadModalProps): React.ReactElement | null {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!groupedSource) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);

    try {
      await downloadDocument(groupedSource.document_id, groupedSource.document_name);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download document");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const pageNumbers = groupedSource.pages
    .filter((p): p is number => p !== null)
    .sort((a, b) => a - b);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden max-h-[85vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
              <h3 className="text-lg font-semibold text-slate-800">Document Source</h3>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-6 overflow-y-auto flex-1">
              {/* Document Info */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-slate-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-slate-800">
                    {groupedSource.document_name}
                  </h4>
                  {pageNumbers.length > 0 && (
                    <p className="text-sm text-slate-500 mt-1">
                      Referenced from {pageNumbers.length === 1 ? "page" : "pages"} {pageNumbers.join(", ")}
                    </p>
                  )}
                  <p className="text-sm text-slate-500 mt-1">
                    Average relevance: {(groupedSource.avg_similarity_score * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              {/* Excerpts */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <BookOpen className="w-4 h-4" />
                  <span>Excerpts ({groupedSource.excerpts.length})</span>
                </div>
                
                {groupedSource.excerpts.map((excerpt, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-4 bg-slate-50 rounded-xl border border-slate-200"
                  >
                    {excerpt.page && (
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                          Page {excerpt.page}
                        </span>
                        <span className="text-xs text-slate-400">
                          {(excerpt.similarity_score * 100).toFixed(0)}% match
                        </span>
                      </div>
                    )}
                    <p className="text-sm text-slate-600 leading-relaxed">
                      "{excerpt.excerpt}"
                    </p>
                  </motion.div>
                ))}
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg"
                >
                  {error}
                </motion.p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200 flex-shrink-0">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-slate-700 bg-white border border-slate-300 rounded-xl font-medium hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex-1 px-4 py-2.5 text-white bg-slate-800 rounded-xl font-medium hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download PDF
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
