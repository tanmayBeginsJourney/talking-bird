"use client";

import { useState } from "react";

export function DocumentUpload(): React.ReactElement {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = async (): Promise<void> => {
    if (!file) return;

    setIsUploading(true);
    try {
      // API call will be implemented here
    } finally {
      setIsUploading(false);
      setFile(null);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
        <input
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer text-primary-600 hover:text-primary-700"
        >
          <span className="text-lg">Click to upload</span>
          <p className="text-sm text-slate-500 mt-2">PDF, DOCX, or TXT (max 50MB)</p>
        </label>
      </div>

      {file && (
        <div className="mt-4">
          <p className="text-sm text-slate-600">Selected: {file.name}</p>
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="mt-3 w-full px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {isUploading ? "Uploading..." : "Upload Document"}
          </button>
        </div>
      )}
    </div>
  );
}



