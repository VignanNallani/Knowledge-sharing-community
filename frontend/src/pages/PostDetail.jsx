


// import { useEffect, useState } from "react";
// import { useParams } from "react-router-dom";
// import { formatDistanceToNow } from "date-fns";
// import api from "../api/axios";
// import CommentBox from "../components/CommentBox";
// import CommentItem from "../components/CommentItem";
// import SkeletonPost from "../components/SkeletonPost";
// import SkeletonComment from "../components/SkeletonComment";

// export default function PostDetail() {
//   const { id } = useParams();

//   const [post, setPost] = useState(null);
//   const [comments, setComments] = useState([]);
//   const [loadingPost, setLoadingPost] = useState(true);
//   const [loadingComments, setLoadingComments] = useState(true);

//   /* ================= FETCH POST ================= */
//   const fetchPost = async () => {
//     try {
//       const res = await api.get(`/api/posts/${id}`);
//       setPost(res.data); // ✅ correct mapping
//     } catch (err) {
//       console.error("Failed to fetch post", err);
//       setPost(null);
//     } finally {
//       setLoadingPost(false);
//     }
//   };

//   /* ================= FETCH COMMENTS ================= */
//   const fetchComments = async () => {
//     try {
//       const res = await api.get(`/api/posts/comment/${id}`);
//       setComments(res.data?.comments || []);
//     } catch (err) {
//       console.error("Failed to fetch comments", err);
//     } finally {
//       setLoadingComments(false);
//     }
//   };

//   /* ================= OPTIMISTIC COMMENT ADD ================= */
//   const addOptimisticComment = (comment) => {
//     setComments((prev) => [comment, ...prev]);
//   };

//   /* ================= REFRESH COMMENTS ================= */
//   const refreshComments = async () => {
//     await fetchComments();
//   };

//   useEffect(() => {
//     fetchPost();
//     fetchComments();
//   }, [id]);

//   return (
//     <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
//       {/* ================= POST ================= */}
//       {loadingPost ? (
//         <SkeletonPost />
//       ) : post ? (
//         <article className="bg-white border rounded-2xl p-6 space-y-4">
//           {/* HEADER */}
//           <div className="flex items-center gap-3">
//             <img
//               src={`https://ui-avatars.com/api/?name=${post.author?.name}`}
//               className="w-10 h-10 rounded-full"
//               alt="avatar"
//             />

//             <div>
//               <div className="font-semibold text-sm text-gray-900">
//                 {post.author?.name}
//               </div>

//               {post.author?.role && (
//                 <span className="inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">
//                   {post.author.role}
//                 </span>
//               )}

//               <div className="text-xs text-gray-500">
//                 {formatDistanceToNow(new Date(post.createdAt), {
//                   addSuffix: true,
//                 })}
//               </div>
//             </div>
//           </div>

//           {/* TITLE */}
//           <h1 className="text-2xl font-bold text-gray-900">
//             {post.title}
//           </h1>

//           {/* CONTENT */}
//           <p className="text-gray-700 leading-relaxed whitespace-pre-line">
//             {post.content}
//           </p>

//           {/* TAGS */}
//           {post.tags?.length > 0 && (
//             <div className="flex flex-wrap gap-2 pt-2">
//               {post.tags.map((tag) => (
//                 <span
//                   key={tag}
//                   className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600"
//                 >
//                   #{tag}
//                 </span>
//               ))}
//             </div>
//           )}
//         </article>
//       ) : (
//         <p className="text-center text-gray-500">Post not found</p>
//       )}

//       {/* ================= COMMENT BOX ================= */}
//       {post && (
//         <CommentBox
//           postId={post.id}
//           onOptimisticAdd={addOptimisticComment}
//           onSuccess={refreshComments}
//         />
//       )}

//       {/* ================= COMMENTS LIST ================= */}
//       <div className="space-y-4">
//         {loadingComments ? (
//           <>
//             <SkeletonComment />
//             <SkeletonComment />
//             <SkeletonComment />
//           </>
//         ) : comments.length === 0 ? (
//           <p className="text-sm text-gray-500 text-center">
//             No comments yet. Be the first to comment.
//           </p>
//         ) : (
//           comments.map((comment) => (
//             <CommentItem
//               key={comment.id}
//               comment={comment}
//               onRefresh={refreshComments}
//             />
//           ))
//         )}
//       </div>
//     </div>
//   );
// }

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios";
import PostCard from "../components/PostCard";
import CommentBox from "../components/CommentBox";
import CommentItem from "../components/CommentItem";
import SkeletonPost from "../components/SkeletonPost";
import SkeletonComment from "../components/SkeletonComment";

export default function PostDetail() {
  const { id } = useParams();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loadingPost, setLoadingPost] = useState(true);
  const [loadingComments, setLoadingComments] = useState(true);

  useEffect(() => {
    fetchPost();
    fetchComments();
  }, [id]);

  const fetchPost = async () => {
    try {
      const res = await api.get(`/api/posts/${id}`);
      setPost(res.data?.data || null);
    } catch (err) {
      console.error("Failed to fetch post", err);
    } finally {
      setLoadingPost(false);
    }
  };

  const fetchComments = async () => {
    try {
      const res = await api.get(`/api/comments/post/${id}`);
      setComments(res.data?.data?.comments || []);
    } catch (err) {
      console.error("Failed to fetch comments", err);
    } finally {
      setLoadingComments(false);
    }
  };

  const addOptimisticComment = (comment) => {
    setComments((prev) => [comment, ...prev]);
  };

  const refreshComments = async () => {
    fetchComments();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Post */}
      {loadingPost ? (
        <SkeletonPost />
      ) : post ? (
        <PostCard post={post} />
      ) : (
        <p className="text-center text-gray-500">Post not found</p>
      )}

      {/* Comment Box */}
      {post && (
        <CommentBox
          postId={post.id}
          onOptimisticAdd={addOptimisticComment}
          onSuccess={refreshComments}
        />
      )}

      {/* Comments */}
      <div className="bg-white rounded-2xl border p-5 space-y-4">
        <h3 className="font-semibold">
          Comments ({comments.length})
        </h3>

        {loadingComments &&
          Array.from({ length: 3 }).map((_, i) => (
            <SkeletonComment key={i} />
          ))}

        {!loadingComments && comments.length === 0 && (
          <p className="text-sm text-gray-500">
            No comments yet. Start the discussion 💬
          </p>
        )}

        {!loadingComments &&
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onRefresh={refreshComments}
            />
          ))}
      </div>
    </div>
  );
}
