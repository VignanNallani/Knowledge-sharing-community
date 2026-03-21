import { useMemo, useState, useEffect } from "react";
import PostCard from "./PostCard";
import api from "../../api/axios";

export default function PostList({ 
  realtimeActivity = {}, 
  search = "", 
  selectedTags = [], 
  sortBy = "latest" 
}) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/api/v1/posts");
      const fetchedPosts = response.data?.posts || response.data || [];
      setPosts(fetchedPosts);
    } catch (err) {
      setError("Failed to load posts");
      console.error("Failed to fetch posts:", err);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-lg"></div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">❌</div>
        <h3 className="text-lg font-medium text-slate-800 mb-2">Failed to load posts</h3>
        <p className="text-sm text-slate-600 mb-4">{error}</p>
        <button 
          onClick={fetchPosts}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  const filteredPosts = useMemo(() => {
    return posts
      .filter((post) => {
        // Search filtering
        const matchesSearch = search === "" || 
          post.title.toLowerCase().includes(search.toLowerCase()) ||
          post.content.toLowerCase().includes(search.toLowerCase()) ||
          post.author.toLowerCase().includes(search.toLowerCase());

        // Tag filtering
        const matchesTags = selectedTags.length === 0 ||
          selectedTags.every((tag) => post.tags.includes(tag));

        return matchesSearch && matchesTags;
      })
      .sort((a, b) => {
        if (sortBy === "latest") return b.createdAt - a.createdAt;
        if (sortBy === "popular") return b.likes - a.likes;
        if (sortBy === "discussed") return b.comments - a.comments;
        return 0;
      });
  }, [posts, search, selectedTags, sortBy]);

  // No results state
  if (filteredPosts.length === 0 && !loading && !error) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">�</div>
        <h3 className="text-lg font-medium text-slate-800 mb-2">No posts yet</h3>
        <p className="text-sm text-slate-600">
          Be the first to share something with the community!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredPosts.map((post) => (
        <PostCard 
          key={post.id} 
          post={post} 
          realtimeActivity={realtimeActivity}
          search={search}
        />
      ))}
    </div>
  );
}
