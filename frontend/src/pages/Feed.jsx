

// import { useEffect, useState, useMemo } from "react";
// import PostCard from "../components/PostCard";
// import SkeletonPost from "../components/SkeletonPost";
// import api from "../api/axios";

// export default function Feed() {
//   const [posts, setPosts] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [sort, setSort] = useState("latest");

//   useEffect(() => {
//     fetchFeed();
//   }, []);

//   const fetchFeed = async () => {
//     try {
//       setLoading(true);
//       const res = await api.get("/api/posts");

//       const data =
//         res.data?.posts ||
//         res.data?.data?.posts ||
//         res.data?.data ||
//         [];

//       setPosts(data);
//     } catch (err) {
//       console.error("Failed to load feed", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const sortedPosts = useMemo(() => {
//     if (!posts.length) return [];

//     const copy = [...posts];

//     if (sort === "latest") {
//       return copy.sort(
//         (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
//       );
//     }

//     if (sort === "trending") {
//       return copy.sort(
//         (a, b) =>
//           (b.likesCount || 0) +
//           (b.commentsCount || 0) -
//           ((a.likesCount || 0) + (a.commentsCount || 0))
//       );
//     }

//     if (sort === "discussed") {
//       return copy.sort(
//         (a, b) => (b.commentsCount || 0) - (a.commentsCount || 0)
//       );
//     }

//     return copy;
//   }, [posts, sort]);

//   return (
//     <div className="max-w-2xl mx-auto space-y-6">
//       {/* Feed Header */}
//       <div className="flex items-start justify-between">
//         <div>
//           <h1 className="text-xl font-semibold text-gray-900">
//   Community Feed
// </h1>
// <p className="text-sm text-gray-500">
//   A production-grade knowledge sharing platform built for early-career engineers
// </p>

//         </div>

//         <select
//           value={sort}
//           onChange={(e) => setSort(e.target.value)}
//           className="border rounded-md px-3 py-1 text-sm bg-white"
//         >
//           <option value="latest">Latest</option>
//           <option value="trending">Trending</option>
//           <option value="discussed">Most Discussed</option>
//         </select>
//       </div>

//       {/* Loading */}
//       {loading &&
//         Array.from({ length: 4 }).map((_, i) => (
//           <SkeletonPost key={i} />
//         ))}

//       {/* Empty State */}
//       {!loading && sortedPosts.length === 0 && (
//         <div className="text-center py-16 border rounded-lg bg-gray-50">
//           <h3 className="text-lg font-medium text-gray-800">
//             No discussions yet
//           </h3>
//           <p className="text-sm text-gray-500 mt-2">
//             Start the first conversation and help the community grow.
//           </p>
//           <button className="mt-4 px-4 py-2 text-sm bg-black text-white rounded-md">
//             Create your first post
//           </button>
//         </div>
//       )}

//       {/* Posts */}
//       {!loading &&
//         sortedPosts.map((post) => (
//           <PostCard key={post.id} post={post} />
//         ))}
//     </div>
//   );
// }

import { useEffect, useMemo, useState } from "react";
import PostCard from "../components/PostCard";
import SkeletonPost from "../components/SkeletonPost";
import api from "../api/axios";

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("latest");

  useEffect(() => {
    fetchFeed();
  }, []);

  const fetchFeed = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/posts");

      const data =
        res.data?.posts ||
        res.data?.data?.posts ||
        res.data?.data ||
        [];

      setPosts(data);
    } catch (err) {
      console.error("Failed to load feed", err);
    } finally {
      setLoading(false);
    }
  };

  const sortedPosts = useMemo(() => {
    if (!posts.length) return [];

    const copy = [...posts];

    switch (sort) {
      case "trending":
        return copy.sort(
          (a, b) =>
            (b.likeCount || 0) +
            (b.commentCount || 0) -
            ((a.likeCount || 0) + (a.commentCount || 0))
        );

      case "discussed":
        return copy.sort(
          (a, b) => (b.commentCount || 0) - (a.commentCount || 0)
        );

      default:
        return copy.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
    }
  }, [posts, sort]);

  return (
    <section className="max-w-app mx-auto space-y-8">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Community Feed
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-md">
            Real discussions, experience sharing, and mentorship for early-career engineers.
          </p>
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-slate-300"
        >
          <option value="latest">Latest</option>
          <option value="trending">Trending</option>
          <option value="discussed">Most Discussed</option>
        </select>
      </div>

      {/* FEED */}
      <div className="space-y-6">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <SkeletonPost key={i} />
          ))}

        {!loading && sortedPosts.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-16 text-center">
            <h3 className="text-lg font-medium text-slate-800">
              No discussions yet
            </h3>
            <p className="text-sm text-slate-500 mt-2">
              Be the first one to start a meaningful conversation.
            </p>
          </div>
        )}

        {!loading &&
          sortedPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
      </div>
    </section>
  );
}
