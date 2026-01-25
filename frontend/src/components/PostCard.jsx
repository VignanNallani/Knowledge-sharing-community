
// import React, { useState } from "react";
// import { Link, useNavigate } from "react-router-dom";
// import { formatDistanceToNow } from "date-fns";
// import { motion } from "framer-motion";
// import api from "../api/axios";
// import Button from "./ui/Button";

// export default function PostCard({ post }) {
//   const navigate = useNavigate();
//   const isAuthenticated = !!localStorage.getItem("token");

//   const [liked, setLiked] = useState(post.isLiked);
//   const [likeCount, setLikeCount] = useState(post.likeCount);
//   const [loading, setLoading] = useState(false);
//   const [bookmarked, setBookmarked] = useState(false);

//   const handleLike = async () => {
//     if (!isAuthenticated) {
//       navigate("/signin");
//       return;
//     }

//     if (loading) return;
//     setLoading(true);

//     const prevLiked = liked;
//     const prevCount = likeCount;

//     setLiked(!prevLiked);
//     setLikeCount(prevLiked ? prevCount - 1 : prevCount + 1);

//     try {
//       await api.post(`/api/posts/${post.id}/like`);
//     } catch {
//       setLiked(prevLiked);
//       setLikeCount(prevCount);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <motion.article
//       layout
//       initial={{ opacity: 0, y: 14 }}
//       animate={{ opacity: 1, y: 0 }}
//       whileHover={{ y: -4 }}
//       transition={{ type: "spring", stiffness: 220, damping: 20 }}
//       className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-shadow"
//     >
//       {/* HEADER */}
//       <div className="flex items-center gap-3">
//         <img
//           src={`https://ui-avatars.com/api/?name=${post.author?.name}&background=0D8ABC&color=fff`}
//           className="w-10 h-10 rounded-full ring-2 ring-white cursor-pointer"
//           alt="avatar"
//           onClick={() => navigate(`/users/${post.author?.id}`)}
//         />

//         <div className="leading-tight">
//           <span
//             onClick={() => navigate(`/users/${post.author?.id}`)}
//             className="text-sm font-semibold text-gray-900 hover:underline cursor-pointer"
//           >
//             {post.author?.name}
//           </span>

//           {/* Role badge */}
//           {post.author?.role && (
//             <span className="inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">
//               {post.author.role}
//             </span>
//           )}

//           <div className="text-xs text-gray-500">
//             {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
//           </div>
//         </div>
//       </div>

//       {/* CONTENT */}
//       <Link to={`/posts/${post.id}`} className="block mt-4 space-y-1">
//         <h3 className="font-semibold text-gray-900 leading-snug line-clamp-2">
//           {post.title}
//         </h3>
//         <p className="text-sm text-gray-600 line-clamp-3">{post.content}</p>
//       </Link>

//       {/* TAGS */}
//       {post.tags?.length > 0 && (
//         <div className="mt-3 flex flex-wrap gap-2">
//           {post.tags.map((tag) => (
//             <span
//               key={tag}
//               onClick={() => navigate(`/?tag=${tag}`)}
//               className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer transition"
//             >
//               #{tag}
//             </span>
//           ))}
//         </div>
//       )}

//       {/* ACTIONS */}
//       <div className="mt-5 flex items-center justify-between text-xs text-gray-500">
//         <div className="flex items-center gap-4">
//           <Button
//             onClick={handleLike}
//             disabled={loading}
//             className={`flex items-center gap-1 font-semibold ${
//               liked ? "text-rose-600" : "hover:text-gray-800"
//             }`}
//           >
//             <span className="text-base">{liked ? "♥" : "♡"}</span>
//             <span>{likeCount}</span>
//           </Button>

//           <Link
//             to={`/posts/${post.id}`}
//             className="hover:text-gray-800 font-medium"
//           >
//             💬 {post.commentCount}
//           </Link>
//         </div>

//         <button
//           onClick={() => setBookmarked(!bookmarked)}
//           className={`text-lg transition ${
//             bookmarked ? "text-amber-500" : "text-gray-400 hover:text-gray-600"
//           }`}
//         >
//           🔖
//         </button>
//       </div>
//     </motion.article>
//   );
// }

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import api from "../api/axios";
import Button from "./ui/Button";

export default function PostCard({ post }) {
  const navigate = useNavigate();
  const isAuthenticated = !!localStorage.getItem("token");

  const [liked, setLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount ?? 0);
  const [loading, setLoading] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const handleLike = async () => {
    if (!isAuthenticated) {
      navigate("/signin");
      return;
    }

    if (loading) return;
    setLoading(true);

    const prevLiked = liked;
    const prevCount = likeCount;

    setLiked(!prevLiked);
    setLikeCount(prevLiked ? prevCount - 1 : prevCount + 1);

    try {
      await api.post(`/api/posts/${post.id}/like`);
    } catch {
      setLiked(prevLiked);
      setLikeCount(prevCount);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 220, damping: 20 }}
      className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-shadow"
    >
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <img
          src={`https://ui-avatars.com/api/?name=${post.author?.name}&background=0D8ABC&color=fff`}
          alt="avatar"
          className="w-10 h-10 rounded-full ring-2 ring-white cursor-pointer"
          onClick={() => navigate(`/users/${post.author?.id}`)}
        />
        <div className="leading-tight">
          <span
            onClick={() => navigate(`/users/${post.author?.id}`)}
            className="text-sm font-semibold text-gray-900 hover:underline cursor-pointer"
          >
            {post.author?.name}
          </span>
          {post.author?.role && (
            <span className="inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">
              {post.author.role}
            </span>
          )}
          <div className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <Link to={`/posts/${post.id}`} className="block mt-4 space-y-1">
        <h3 className="font-semibold text-gray-900 leading-snug line-clamp-2">
          {post.title}
        </h3>
        <p className="text-sm text-gray-600 line-clamp-3">{post.content}</p>
      </Link>

      {/* TAGS */}
      {post.tags?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              onClick={() => navigate(`/?tag=${tag}`)}
              className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer transition"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* ACTIONS */}
      <div className="mt-5 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <Button
            onClick={handleLike}
            disabled={loading}
            className={`flex items-center gap-1 font-semibold ${liked ? "text-rose-600" : "hover:text-gray-800"}`}
          >
            <span className="text-base">{liked ? "♥" : "♡"}</span>
            <span>{likeCount}</span>
          </Button>

          <Link to={`/posts/${post.id}`} className="hover:text-gray-800 font-medium">
            💬 {post.commentCount ?? 0}
          </Link>
        </div>

        <button
          onClick={() => setBookmarked(!bookmarked)}
          className={`text-lg transition ${bookmarked ? "text-amber-500" : "text-gray-400 hover:text-gray-600"}`}
        >
          🔖
        </button>
      </div>
    </motion.article>
  );
}
