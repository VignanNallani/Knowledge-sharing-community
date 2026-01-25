



// import { useState } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import { FiHeart } from "react-icons/fi";
// import { useNavigate } from "react-router-dom";
// import api from "../api/axios";
// import { formatDistanceToNow } from "date-fns";

// function RoleBadge({ role }) {
//   if (!role) return null;

//   const styles = {
//     MENTOR: "bg-yellow-100 text-yellow-800",
//     ADMIN: "bg-purple-100 text-purple-800",
//     USER: "bg-gray-100 text-gray-600",
//   };

//   const labels = {
//     MENTOR: "Mentor",
//     ADMIN: "Admin",
//     USER: "Engineer",
//   };

//   return (
//     <span
//       className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${styles[role]}`}
//     >
//       {labels[role]}
//     </span>
//   );
// }

// export default function CommentItem({ comment, depth = 0 }) {
//   const navigate = useNavigate();
//   const [liked, setLiked] = useState(comment.isLiked);
//   const [likeCount, setLikeCount] = useState(
//     comment.likesCount ?? comment.likeCount ?? 0
//   );

//   const [showReply, setShowReply] = useState(false);
//   const [reply, setReply] = useState("");
//   const [replyLoading, setReplyLoading] = useState(false);
//   const [likeLoading, setLikeLoading] = useState(false);

//   const toggleLike = async () => {
//     if (comment.optimistic || likeLoading) return;

//     setLikeLoading(true);
//     const prevLiked = liked;
//     const prevCount = likeCount;

//     setLiked(!prevLiked);
//     setLikeCount(prevLiked ? prevCount - 1 : prevCount + 1);

//     try {
//       await api.post(`/api/comments/like/${comment.id}`);
//     } catch {
//       setLiked(prevLiked);
//       setLikeCount(prevCount);
//     } finally {
//       setLikeLoading(false);
//     }
//   };

//   const submitReply = async () => {
//     if (!reply.trim() || replyLoading) return;

//     setReplyLoading(true);
//     try {
//       await api.post("/api/posts/comment", {
//         postId: comment.postId,
//         content: reply,
//       });
//       setReply("");
//       setShowReply(false);
//     } catch (err) {
//       console.error("Reply failed", err);
//     } finally {
//       setReplyLoading(false);
//     }
//   };

//   return (
//     <motion.div
//       initial={{ opacity: 0, y: 6 }}
//       animate={{ opacity: 1, y: 0 }}
//       className={`rounded-xl border p-4 transition ${
//         comment.optimistic
//           ? "bg-gray-50 border-dashed opacity-70"
//           : "bg-white border-[var(--border-light)] hover:shadow-sm"
//       } ${depth > 0 ? "ml-4" : ""}`}
//     >
//       {/* Header */}
//       <div className="flex items-start gap-3 mb-2">
//         <img
//           src={`https://ui-avatars.com/api/?name=${comment.author?.name}`}
//           className="w-8 h-8 rounded-full cursor-pointer"
//           alt="avatar"
//           onClick={() => navigate(`/users/${comment.author?.id}`)}
//         />
//         <div className="flex-1">
//           <div className="flex items-center gap-2">
//             <span
//               className="text-sm font-medium cursor-pointer"
//               onClick={() => navigate(`/users/${comment.author?.id}`)}
//             >
//               {comment.author?.name}
//             </span>
//             <RoleBadge role={comment.author?.role} />
//           </div>
//           <div className="text-xs text-gray-400">
//             {comment.optimistic
//               ? "Posting…"
//               : formatDistanceToNow(new Date(comment.createdAt), {
//                   addSuffix: true,
//                 })}
//           </div>
//         </div>
//       </div>

//       {/* Content */}
//       <p className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">
//         {comment.content}
//       </p>

//       {/* Actions */}
//       {!comment.optimistic && (
//         <div className="flex items-center gap-4 text-xs">
//           <motion.button
//             whileTap={{ scale: 1.15 }}
//             onClick={toggleLike}
//             disabled={likeLoading}
//             className={`flex items-center gap-1 transition ${
//               liked ? "text-rose-600" : "text-gray-500 hover:text-black"
//             }`}
//           >
//             <FiHeart className={liked ? "fill-current" : ""} />
//             {likeCount}
//           </motion.button>

//           <button
//             onClick={() => setShowReply(!showReply)}
//             className="text-gray-500 hover:text-black"
//           >
//             Reply
//           </button>
//         </div>
//       )}

//       {/* Reply Box */}
//       <AnimatePresence>
//         {showReply && (
//           <motion.div
//             initial={{ opacity: 0, height: 0 }}
//             animate={{ opacity: 1, height: "auto" }}
//             exit={{ opacity: 0, height: 0 }}
//             className="mt-3 pl-3 border-l space-y-2"
//           >
//             <textarea
//               value={reply}
//               onChange={(e) => setReply(e.target.value)}
//               rows={2}
//               placeholder="Write a reply..."
//               className="w-full border rounded-lg p-2 text-sm resize-none focus:ring-2 focus:ring-black"
//             />
//             <button
//               onClick={submitReply}
//               disabled={replyLoading}
//               className="px-3 py-1 text-xs bg-black text-white rounded hover:bg-gray-900 disabled:opacity-50"
//             >
//               {replyLoading ? "Replying..." : "Reply"}
//             </button>
//           </motion.div>
//         )}
//       </AnimatePresence>
//     </motion.div>
//   );
// }








import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiHeart } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { formatDistanceToNow } from "date-fns";

function RoleBadge({ role }) {
  if (!role) return null;

  const styles = {
    MENTOR: "bg-yellow-100 text-yellow-800",
    ADMIN: "bg-purple-100 text-purple-800",
    USER: "bg-gray-100 text-gray-600",
  };

  const labels = {
    MENTOR: "Mentor",
    ADMIN: "Admin",
    USER: "Engineer",
  };

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${styles[role]}`}
    >
      {labels[role]}
    </span>
  );
}

export default function CommentItem({ comment, depth = 0 }) {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(comment.isLiked);
  const [likeCount, setLikeCount] = useState(comment.likesCount ?? comment.likeCount ?? 0);
  const [showReply, setShowReply] = useState(false);
  const [reply, setReply] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);

  const toggleLike = async () => {
    if (comment.optimistic || likeLoading) return;

    setLikeLoading(true);
    const prevLiked = liked;
    const prevCount = likeCount;

    setLiked(!prevLiked);
    setLikeCount(prevLiked ? prevCount - 1 : prevCount + 1);

    try {
      await api.post(`/api/comments/like/${comment.id}`);
    } catch {
      setLiked(prevLiked);
      setLikeCount(prevCount);
    } finally {
      setLikeLoading(false);
    }
  };

  const submitReply = async () => {
    if (!reply.trim() || replyLoading) return;

    setReplyLoading(true);
    try {
      await api.post("/api/posts/comment", {
        postId: comment.postId,
        content: reply,
      });
      setReply("");
      setShowReply(false);
    } catch (err) {
      console.error("Reply failed", err);
    } finally {
      setReplyLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 transition ${
        comment.optimistic
          ? "bg-gray-50 border-dashed opacity-70"
          : "bg-white border-[var(--border-light)] hover:shadow-sm"
      } ${depth > 0 ? "ml-4" : ""}`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-2">
        <img
          src={`https://ui-avatars.com/api/?name=${comment.author?.name}`}
          alt="avatar"
          className="w-8 h-8 rounded-full cursor-pointer"
          onClick={() => navigate(`/users/${comment.author?.id}`)}
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-medium cursor-pointer"
              onClick={() => navigate(`/users/${comment.author?.id}`)}
            >
              {comment.author?.name}
            </span>
            <RoleBadge role={comment.author?.role} />
          </div>
          <div className="text-xs text-gray-400">
            {comment.optimistic
              ? "Posting…"
              : formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
          </div>
        </div>
      </div>

      {/* Content */}
      <p className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">
        {comment.content}
      </p>

      {/* Actions */}
      {!comment.optimistic && (
        <div className="flex items-center gap-4 text-xs">
          <motion.button
            whileTap={{ scale: 1.15 }}
            onClick={toggleLike}
            disabled={likeLoading}
            className={`flex items-center gap-1 transition ${liked ? "text-rose-600" : "text-gray-500 hover:text-black"}`}
          >
            <FiHeart className={liked ? "fill-current" : ""} />
            {likeCount}
          </motion.button>

          <button
            onClick={() => setShowReply(!showReply)}
            className="text-gray-500 hover:text-black"
          >
            Reply
          </button>
        </div>
      )}

      {/* Reply Box */}
      <AnimatePresence>
        {showReply && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pl-3 border-l space-y-2"
          >
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={2}
              placeholder="Write a reply..."
              className="w-full border rounded-lg p-2 text-sm resize-none focus:ring-2 focus:ring-black"
            />
            <button
              onClick={submitReply}
              disabled={replyLoading}
              className="px-3 py-1 text-xs bg-black text-white rounded hover:bg-gray-900 disabled:opacity-50"
            >
              {replyLoading ? "Replying..." : "Reply"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
