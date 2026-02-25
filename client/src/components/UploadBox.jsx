import { useState, useRef } from "react";
import api from "../services/api";

export default function UploadBox({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const selected = e.target.files[0];
    setError("");

    if (selected && selected.type !== "application/pdf") {
      setError("Only PDF files are accepted.");
      e.target.value = "";
      return;
    }
    if (selected && selected.size > 5 * 1024 * 1024) {
      setError("File is too large. Max size is 5 MB.");
      e.target.value = "";
      return;
    }
    setFile(selected ?? null);
  };

  const uploadFile = async () => {
    if (!file) {
      setError("Please select a PDF file first.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("resume", file);

      const res = await api.post("/resume/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      onUploaded(res.data.data.resume);
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
        "Upload failed. Please check your file and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 bg-white space-y-4 text-center hover:border-indigo-300 transition-colors">
      {/* Drop zone / file picker */}
      <div
        className="cursor-pointer space-y-2"
        onClick={() => inputRef.current?.click()}
      >
        <div className="text-4xl">📄</div>
        <p className="text-sm font-medium text-gray-700">
          {file ? file.name : "Click to select a PDF resume"}
        </p>
        <p className="text-xs text-gray-400">PDF only · Max 5 MB · Text-based (not scanned)</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={handleChange}
        className="hidden"
      />

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        onClick={uploadFile}
        disabled={loading || !file}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Uploading…
          </>
        ) : (
          "Upload Resume"
        )}
      </button>
    </div>
  );
}