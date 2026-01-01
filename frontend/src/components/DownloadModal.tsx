"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, FileText, Loader2 } from "lucide-react";
import { downloadDocument } from "@/lib/api";
import type { SourceResponse } from "@/lib/types";

interface DownloadModalProps {
  source: SourceResponse | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DownloadModal({ source, isOpen, onClose }: DownloadModalProps): React.ReactElement | null {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!source) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);

    try {
      await downloadDocument(source.document_id, source.document_name);
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
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Download Document</h3>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-slate-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-slate-800 truncate">
                    {source.document_name}
                  </h4>
                  {source.page_number && (
                    <p className="text-sm text-slate-500 mt-1">
                      Referenced from page {source.page_number}
                    </p>
                  )}
                  <p className="text-sm text-slate-500 mt-1">
                    Relevance: {(source.similarity_score * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              {/* Excerpt preview */}
              <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-sm text-slate-600 leading-relaxed line-clamp-4">
                  "{source.excerpt}"
                </p>
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
            <div className="flex items-center gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-slate-700 bg-white border border-slate-300 rounded-xl font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
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
                    Download
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

