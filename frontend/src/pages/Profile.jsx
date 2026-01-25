// import React, { useEffect, useState } from "react";
// import { useParams } from "react-router-dom";
// import api from "../api/axios";

// export default function Profile() {
//   const { id } = useParams();
//   const [user, setUser] = useState(null);
//   const [posts, setPosts] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [activeTab, setActiveTab] = useState("posts");

//   const getCurrent = () => {
//     try {
//       const token = localStorage.getItem("token");
//       if (!token) return null;
//       return JSON.parse(atob(token.split(".")[1]));
//     } catch {
//       return null;
//     }
//   };

//   const current = getCurrent();

//   useEffect(() => {
//     setLoading(true);
//     Promise.all([
//       api.get(`/api/users/${id}`),
//       api.get(`/api/users/${id}/posts`)
//     ])
//       .then(([u, p]) => {
//         setUser(u.data.user || u.data);
//         setPosts(p.data.posts || p.data);
//       })
//       .finally(() => setLoading(false));
//   }, [id]);

//   const handleFollow = async () => {
//     if (!localStorage.getItem("token"))
//       return alert("Sign in to follow");

//     const wasFollowing = user.isFollowing;
//     setUser((u) => ({
//       ...u,
//       isFollowing: !wasFollowing,
//       followersCount: u.followersCount + (wasFollowing ? -1 : 1)
//     }));

//     try {
//       await api.post(`/api/users/${id}/follow`);
//     } catch {
//       setUser((u) => ({
//         ...u,
//         isFollowing: wasFollowing,
//         followersCount: u.followersCount
//       }));
//     }
//   };

//   if (loading) return (
//     <div className="flex items-center justify-center min-h-[50vh]">
//       <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
//     </div>
//   );

//   if (!user) return <div className="text-center py-20 text-[var(--text-secondary)]">User not found</div>;

//   return (
//     <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn">
//       {/* ─── BANNER HEADER ─── */}
//       <div className="relative">
//         {/* Banner Image */}
//         <div className="h-48 md:h-64 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-lg relative overflow-hidden">
//           <div className="absolute inset-0 bg-black/10"></div>
//           {/* Decorative circles */}
//           <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-3xl"></div>
//           <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-black/10 blur-3xl"></div>
//         </div>

//         {/* Profile Info Overlay */}
//         <div className="px-6 md:px-10 pb-6">
//           <div className="relative -mt-20 flex flex-col md:flex-row items-end md:items-end gap-6">

//             {/* Avatar */}
//             <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-[var(--bg-main)] bg-white shadow-xl overflow-hidden flex items-end justify-center relative z-10">
//               <img
//                 src={`https://ui-avatars.com/api/?name=${user.name}&background=random&size=256`}
//                 alt={user.name}
//                 className="w-full h-full object-cover"
//               />
//             </div>

//             {/* Info */}
//             <div className="flex-1 pb-2">
//               <h1 className="text-3xl font-bold text-[var(--text-primary)] leading-tight">
//                 {user.name}
//               </h1>
//               <p className="text-[var(--text-secondary)] mt-1 font-medium max-w-2xl">
//                 {user.bio || "Tech enthusiast & Knowledge sharer"}
//               </p>
//             </div>

//             {/* Actions */}
//             <div className="pb-4 flex gap-3">
//               {current?.id !== user.id && (
//                 <button
//                   onClick={handleFollow}
//                   className={`btn ${user.isFollowing
//                       ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
//                       : "btn-primary"
//                     }`}
//                 >
//                   {user.isFollowing ? "Following" : "Follow"}
//                 </button>
//               )}
//               <button className="btn btn-ghost border border-[var(--border-soft)]">
//                 Message
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* ─── STATS CARDS ─── */}
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//         {[
//           { label: "Total Posts", value: user.postsCount ?? posts.length, icon: "📝" },
//           { label: "Followers", value: user.followersCount ?? 0, icon: "👥" },
//           { label: "Following", value: user.followingCount ?? 0, icon: "👣" },
//         ].map((stat, idx) => (
//           <div key={idx} className="card flex items-center gap-5 p-6 hover:translate-y-[-2px] transition-transform">
//             <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center text-2xl">
//               {stat.icon}
//             </div>
//             <div>
//               <div className="text-2xl font-bold text-[var(--text-primary)]">{stat.value}</div>
//               <div className="text-[var(--text-secondary)] font-medium text-sm uppercase tracking-wider">{stat.label}</div>
//             </div>
//           </div>
//         ))}
//       </div>

//       {/* ─── CONTENT TABS ─── */}
//       <div className="flex flex-col lg:flex-row gap-8">

//         {/* Main Feed */}
//         <div className="flex-1 space-y-6">
//           {/* Tabs Header */}
//           <div className="flex items-center gap-8 border-b border-[var(--border-soft)] pb-1">
//             {["posts", "activity", "mentorships"].map((tab) => (
//               <button
//                 key={tab}
//                 onClick={() => setActiveTab(tab)}
//                 className={`pb-3 text-sm font-semibold capitalize transition-all relative ${activeTab === tab
//                     ? "text-[var(--accent-primary)]"
//                     : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
//                   }`}
//               >
//                 {tab}
//                 {activeTab === tab && (
//                   <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[var(--accent-primary)] rounded-t-full"></span>
//                 )}
//               </button>
//             ))}
//           </div>

//           {/* Tab Content */}
//           <div className="min-h-[300px]">
//             {activeTab === "posts" && (
//               <div className="space-y-6">
//                 {posts.length === 0 ? (
//                   <div className="text-center py-16 border-2 border-dashed border-[var(--border-soft)] rounded-2xl">
//                     <div className="text-4xl mb-4">✍️</div>
//                     <div className="text-[var(--text-primary)] font-medium">No posts published yet</div>
//                     <p className="text-[var(--text-secondary)] text-sm">When {user.name} writes something, it will appear here.</p>
//                   </div>
//                 ) : (
//                   posts.map((p) => (
//                     <div key={p.id} className="card group cursor-pointer">
//                       <h3 className="text-xl font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
//                         {p.title}
//                       </h3>
//                       <p className="mt-3 text-[var(--text-secondary)] line-clamp-3 leading-relaxed">
//                         {p.content}
//                       </p>
//                       <div className="mt-4 pt-4 border-t border-[var(--border-soft)] flex items-center gap-4 text-sm text-[var(--text-secondary)]">
//                         <span>{new Date(p.createdAt || Date.now()).toLocaleDateString()}</span>
//                         <span>•</span>
//                         <span>{p.likes || 0} Likes</span>
//                         <span className="ml-auto text-[var(--accent-primary)] font-medium group-hover:underline">Read Article →</span>
//                       </div>
//                     </div>
//                   ))
//                 )}
//               </div>
//             )}

//             {activeTab === "activity" && (
//               <div className="text-center py-12">
//                 <p className="text-[var(--text-secondary)]">No recent activity to show.</p>
//               </div>
//             )}

//             {activeTab === "mentorships" && (
//               <div className="text-center py-12">
//                 <p className="text-[var(--text-secondary)]">Mentorship history is private or empty.</p>
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Sidebar Info */}
//         <div className="lg:w-80 space-y-6">
//           <div className="card">
//             <h4 className="font-bold text-[var(--text-primary)] mb-4">About</h4>
//             <div className="space-y-4 text-sm text-[var(--text-secondary)]">
//               <div className="flex items-center gap-3">
//                 <span>📍</span> {user.location || "Earth, Milky Way"}
//               </div>
//               <div className="flex items-center gap-3">
//                 <span>💼</span> {user.role || "Community Member"}
//               </div>
//               <div className="flex items-center gap-3">
//                 <span>📅</span> Joined {new Date(user.joinedAt || Date.now()).toLocaleDateString()}
//               </div>
//             </div>
//           </div>
//         </div>

//       </div>
//     </div>
//   );
// }


import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios";

export default function Profile() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("posts");

  const getCurrent = () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return null;
      return JSON.parse(atob(token.split(".")[1]));
    } catch {
      return null;
    }
  };

  const current = getCurrent();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/api/users/${id}`),
      api.get(`/api/users/${id}/posts`)
    ])
      .then(([u, p]) => {
        setUser(u.data.user || u.data);
        setPosts(p.data.posts || p.data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleFollow = async () => {
    if (!localStorage.getItem("token"))
      return alert("Sign in to follow");

    const wasFollowing = user.isFollowing;
    setUser((u) => ({
      ...u,
      isFollowing: !wasFollowing,
      followersCount: u.followersCount + (wasFollowing ? -1 : 1)
    }));

    try {
      await api.post(`/api/users/${id}/follow`);
    } catch {
      setUser((u) => ({
        ...u,
        isFollowing: wasFollowing,
        followersCount: u.followersCount
      }));
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
    </div>
  );

  if (!user) return <div className="text-center py-20 text-[var(--text-secondary)]">User not found</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn">
      {/* ─── BANNER HEADER ─── */}
      <div className="relative">
        {/* Banner Image */}
      <div className="h-48 md:h-64 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 shadow-lg relative overflow-hidden">

          <div className="absolute inset-0 bg-black/10"></div>
          {/* Decorative circles */}
         
        </div>

        {/* Profile Info Overlay */}
        <div className="px-6 md:px-10 pb-6">
          <div className="relative -mt-20 flex flex-col md:flex-row items-end md:items-end gap-6">

            {/* Avatar */}
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-[var(--bg-main)] bg-white shadow-xl overflow-hidden flex items-end justify-center relative z-10">
              <img
                src={`https://ui-avatars.com/api/?name=${user.name}&background=random&size=256`}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Info */}
            <div className="flex-1 pb-2">
              <h1 className="text-3xl font-bold text-[var(--text-primary)] leading-tight">
                {user.name}
              </h1>
              <p className="text-[var(--text-secondary)] mt-1 font-medium max-w-2xl">
                {user.bio || "Tech enthusiast & Knowledge sharer"}
              </p>
            </div>

            {/* Actions */}
            <div className="pb-4 flex gap-3">
              {current?.id !== user.id && (
                <button
                  onClick={handleFollow}
                  className={`btn ${user.isFollowing
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      : "btn-primary"
                    }`}
                >
                  {user.isFollowing ? "Following" : "Follow"}
                </button>
              )}
              <button className="btn btn-ghost border border-[var(--border-soft)]">
                Message
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── STATS CARDS ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Total Posts", value: user.postsCount ?? posts.length, icon: "📝" },
          { label: "Followers", value: user.followersCount ?? 0, icon: "👥" },
          { label: "Following", value: user.followingCount ?? 0, icon: "👣" },
        ].map((stat, idx) => (
          <div key={idx} className="card flex items-center gap-5 p-6 hover:translate-y-[-2px] transition-transform">
            <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center text-2xl">
              {stat.icon}
            </div>
            <div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">{stat.value}</div>
              <div className="text-[var(--text-secondary)] font-medium text-sm uppercase tracking-wider">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── CONTENT TABS ─── */}
      <div className="flex flex-col lg:flex-row gap-8">

        {/* Main Feed */}
        <div className="flex-1 space-y-6">
          {/* Tabs Header */}
          <div className="flex items-center gap-8 border-b border-[var(--border-soft)] pb-1">
            {["posts", "activity", "mentorships"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-semibold capitalize transition-all relative ${activeTab === tab
                    ? "text-[var(--accent-primary)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
              >
                {tab}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[var(--accent-primary)] rounded-t-full"></span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="min-h-[300px]">
            {activeTab === "posts" && (
              <div className="space-y-6">
                {posts.length === 0 ? (
                  <div className="text-center py-16 border-2 border-dashed border-[var(--border-soft)] rounded-2xl">
                    <div className="text-4xl mb-4">✍️</div>
                    <div className="text-[var(--text-primary)] font-medium">No posts published yet</div>
                    <p className="text-[var(--text-secondary)] text-sm">When {user.name} writes something, it will appear here.</p>
                  </div>
                ) : (
                  posts.map((p) => (
                    <div key={p.id} className="card group cursor-pointer">
                      <h3 className="text-xl font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                        {p.title}
                      </h3>
                      <p className="mt-3 text-[var(--text-secondary)] line-clamp-3 leading-relaxed">
                        {p.content}
                      </p>
                      <div className="mt-4 pt-4 border-t border-[var(--border-soft)] flex items-center gap-4 text-sm text-[var(--text-secondary)]">
                        <span>{new Date(p.createdAt || Date.now()).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{p.likes || 0} Likes</span>
                        <span className="ml-auto text-[var(--accent-primary)] font-medium group-hover:underline">Read Article →</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "activity" && (
              <div className="text-center py-12">
                <p className="text-[var(--text-secondary)]">No recent activity to show.</p>
              </div>
            )}

            {activeTab === "mentorships" && (
              <div className="text-center py-12">
                <p className="text-[var(--text-secondary)]">Mentorship history is private or empty.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="lg:w-80 space-y-6">
          <div className="card">
            <h4 className="font-bold text-[var(--text-primary)] mb-4">About</h4>
            <div className="space-y-4 text-sm text-[var(--text-secondary)]">
              <div className="flex items-center gap-3">
                <span>📍</span> {user.location || "Earth, Milky Way"}
              </div>
              <div className="flex items-center gap-3">
                <span>💼</span> {user.role || "Community Member"}
              </div>
              <div className="flex items-center gap-3">
                <span>📅</span> Joined {new Date(user.joinedAt || Date.now()).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
  