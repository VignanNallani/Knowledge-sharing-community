

// import { useEffect, useState } from "react";
// import { useParams } from "react-router-dom";
// import api from "../api/axios";
// import PostCard from "../components/PostCard";
// import SkeletonPost from "../components/SkeletonPost";

// export default function UserProfile() {
//   const { id } = useParams();

//   const [user, setUser] = useState(null);
//   const [posts, setPosts] = useState([]);
//   const [loadingUser, setLoadingUser] = useState(true);
//   const [loadingPosts, setLoadingPosts] = useState(true);

//   /* ================= FETCH USER ================= */
//   const fetchUser = async () => {
//     try {
//       const res = await api.get(`/api/users/${id}`);
//       setUser(res.data?.data || null);
//     } catch (err) {
//       console.error("Failed to fetch user", err);
//     } finally {
//       setLoadingUser(false);
//     }
//   };

//   /* ================= FETCH USER POSTS ================= */
//   const fetchPosts = async () => {
//     try {
//       const res = await api.get(`/api/posts?authorId=${id}`);
//       setPosts(res.data?.posts || []);
//     } catch (err) {
//       console.error("Failed to fetch user's posts", err);
//     } finally {
//       setLoadingPosts(false);
//     }
//   };

//   useEffect(() => {
//     fetchUser();
//     fetchPosts();
//   }, [id]);

//   if (loadingUser) {
//     return (
//       <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
//         <SkeletonPost />
//         <SkeletonPost />
//       </div>
//     );
//   }

//   if (!user) {
//     return (
//       <p className="text-center text-gray-500 mt-10">
//         User not found
//       </p>
//     );
//   }

//   return (
//     <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
//       {/* ================= USER HEADER ================= */}
//       <div className="flex items-center gap-4 bg-white p-5 rounded-2xl shadow-sm">
//         <img
//           src={`https://ui-avatars.com/api/?name=${user.name}&background=0D8ABC&color=fff`}
//           alt="avatar"
//           className="w-16 h-16 rounded-full"
//         />
//         <div>
//           <h2 className="text-lg font-semibold">{user.name}</h2>
//           {user.role && (
//             <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">
//               {user.role}
//             </span>
//           )}
//           <p className="text-sm text-gray-500 mt-1">{user.bio || "No bio provided"}</p>
//         </div>
//       </div>

//       {/* ================= USER POSTS ================= */}
//       <div className="space-y-6">
//         {loadingPosts ? (
//           <>
//             <SkeletonPost />
//             <SkeletonPost />
//             <SkeletonPost />
//           </>
//         ) : posts.length === 0 ? (
//           <p className="text-center text-gray-500">
//             This user has not posted anything yet.
//           </p>
//         ) : (
//           posts.map((post) => <PostCard key={post.id} post={post} />)
//         )}
//       </div>
//     </div>
//   );
// }




import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios";
import PostCard from "../components/PostCard";
import SkeletonPost from "../components/SkeletonPost";

export default function UserProfile() {
  const { id } = useParams();

  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const fetchUser = async () => {
    try {
      const res = await api.get(`/api/users/${id}`);
      setUser(res.data?.data ?? null);
    } catch (err) {
      console.error("Failed to fetch user", err);
    } finally {
      setLoadingUser(false);
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await api.get(`/api/posts?authorId=${id}`);
      setPosts(res.data?.posts ?? []);
    } catch (err) {
      console.error("Failed to fetch user's posts", err);
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    fetchUser();
    fetchPosts();
  }, [id]);

  if (loadingUser) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <SkeletonPost />
        <SkeletonPost />
      </div>
    );
  }

  if (!user) {
    return <p className="text-center text-gray-500 mt-10">User not found</p>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* USER HEADER */}
      <div className="flex items-center gap-4 bg-white p-5 rounded-2xl shadow-sm">
        <img
          src={`https://ui-avatars.com/api/?name=${user.name}&background=0D8ABC&color=fff`}
          alt="avatar"
          className="w-16 h-16 rounded-full"
        />
        <div>
          <h2 className="text-lg font-semibold">{user.name}</h2>
          {user.role && (
            <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">
              {user.role}
            </span>
          )}
          <p className="text-sm text-gray-500 mt-1">{user.bio ?? "No bio provided"}</p>
        </div>
      </div>

      {/* USER POSTS */}
      <div className="space-y-6">
        {loadingPosts ? (
          <>
            <SkeletonPost />
            <SkeletonPost />
            <SkeletonPost />
          </>
        ) : posts.length === 0 ? (
          <p className="text-center text-gray-500">This user has not posted anything yet.</p>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  );
}
