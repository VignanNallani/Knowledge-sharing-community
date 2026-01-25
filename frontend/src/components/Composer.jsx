import React, { useState } from "react";
import api from "../api/axios";

export default function Composer({ onCreate }) {
  const [active, setActive] = useState(false);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      const res = await api.post("/api/posts", { title, content });
      onCreate?.(res.data);
      setContent("");
      setTitle("");
      setActive(false);
    } catch {
      // Error
    } finally {
      setLoading(false);
    }
  };

  if (!active) {
    return (
      <div
        onClick={() => setActive(true)}
        className="bg-white border border-[var(--border-light)] rounded-lg p-3 flex items-center gap-3 cursor-text hover:border-[var(--border-brand)] transition-colors shadow-sm"
      >
        <div className="w-7 h-7 rounded-sm bg-gray-100 flex items-center justify-center text-xs text-gray-400">
          ✎
        </div>
        <span className="text-sm text-[var(--text-tertiary)]">Start a new discussion...</span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[var(--border-brand)] rounded-lg p-4 shadow-sm animate-in">
      <div className="flex justify-between items-start mb-2">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full text-base font-semibold placeholder:text-gray-300 focus:outline-none"
          placeholder="Title"
          autoFocus
        />
        <button onClick={() => setActive(false)} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        className="w-full min-h-[80px] text-sm resize-none focus:outline-none placeholder:text-gray-400"
        placeholder="What's happening?"
      />

      <div className="flex justify-end pt-2 mt-2 border-t border-[var(--border-light)]">
        <button
          disabled={!content.trim() || loading}
          onClick={submit}
          className="btn btn-primary text-xs h-8 px-4"
        >
          {loading ? "Posting..." : "Post"}
        </button>
      </div>
    </div>
  );
}
