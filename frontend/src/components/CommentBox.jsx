

// import { useState } from "react";
// import { motion } from "framer-motion";
// import api from "../api/axios";

// export default function CommentBox({ postId, onSuccess }) {
//   const [content, setContent] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   const handleInput = (e) => {
//     const value = e.target.value;
//     setContent(value);

//     if (value.includes("@")) {
//       // 🔜 future: show user mention dropdown
//     }
//   };

//   const submitComment = async () => {
//     if (!content.trim()) return;

//     setLoading(true);
//     setError("");

//     try {
//       await api.post("/api/posts/comment", { postId, content });
//       setContent("");
//       onSuccess?.();
//     } catch {
//       setError("Failed to post comment. Try again.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <motion.div
//       initial={{ opacity: 0, y: 6 }}
//       animate={{ opacity: 1, y: 0 }}
//       className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl p-4 shadow-sm"
//     >
//       {error && <div className="text-sm text-red-500 mb-2">{error}</div>}

//       <textarea
//         rows={3}
//         placeholder="Write a comment..."
//         value={content}
//         onChange={handleInput}
//         disabled={loading}
//         className="w-full border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400"
//       />

//       <div className="flex justify-end mt-2">
//         <button
//           onClick={submitComment}
//           disabled={loading || !content.trim()}
//           className="px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-900 transition disabled:opacity-50"
//         >
//           {loading ? "Posting..." : "Comment"}
//         </button>
//       </div>
//     </motion.div>
//   );
// }



import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import api from "../api/axios";
import PropTypes from 'prop-types';

export default function CommentBox({
  postId,
  onSuccess,
  onOptimisticAdd,
}) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const submitComment = async () => {
    if (!content.trim() || loading) return;

    setLoading(true);
    setError("");

    // 🧠 1️⃣ Optimistic comment object
    const tempId = `temp-${Date.now()}`;
    const optimisticComment = {
      id: tempId,
      content,
      createdAt: new Date().toISOString(),
      likeCount: 0,
      isLiked: false,
      optimistic: true,
      author: {
        name: "You",
      },
      postId,
    };

    // 🚀 2️⃣ Insert immediately into UI
    onOptimisticAdd?.(optimisticComment);

    try {
      // 🌐 3️⃣ Send to backend
      await api.post("/api/posts/comment", { postId, content });

      setContent("");

      // 🔄 4️⃣ Re-sync with backend (safe + clean)
      onSuccess?.();
    } catch {
      setError("Failed to post comment. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl p-4 shadow-sm"
    >
      {error && (
        <div className="text-sm text-red-500 mb-2">{error}</div>
      )}

      <textarea
        ref={textareaRef}
        rows={3}
        placeholder="Write a comment..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={loading}
        className="w-full border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400"
      />

      <div className="flex justify-end mt-2">
        <button
          onClick={submitComment}
          disabled={loading || !content.trim()}
          className="px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-900 transition disabled:opacity-50"
        >
          {loading ? "Posting..." : "Comment"}
        </button>
      </div>
    </motion.div>
  );
}

CommentBox.propTypes = {
  postId: PropTypes.string.isRequired,
  onSuccess: PropTypes.func,
  onOptimisticAdd: PropTypes.func
};
