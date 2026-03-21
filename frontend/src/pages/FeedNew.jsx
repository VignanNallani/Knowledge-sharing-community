import Layout from '../components/layout/Layout';
import PostComposer from '../components/feed/PostComposer';
import PostList from '../components/feed/PostList';
import useRealtime from '../hooks/useRealtime';
import useFeedQuery from '../hooks/useFeedQuery';
import useDebounce from '../hooks/useDebounce';
import apiService from '../services/api';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function FeedNew() {
  const { isConnected, activity } = useRealtime();
  const { query, updateSearch, toggleTag, updateSort } = useFeedQuery();
  const { user: currentUser } = useAuth();
  const debouncedSearch = useDebounce(query.search, 400);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch posts from real API
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const response = await apiService.getPosts({
          page: 1,
          limit: 20,
          search: debouncedSearch,
          sortBy: query.sortBy
        });
        
        // Handle backend response format
        const fetchedPosts = response.data || [];
        setPosts(fetchedPosts);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch posts:', err);
        setError('Failed to load posts. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [debouncedSearch, query.sortBy]);

  const handleCreatePost = async (postData) => {
    try {
      // Optimistic UI - Add post immediately
      const optimisticPost = {
        id: Date.now(), // Temporary ID
        ...postData,
        author: {
          id: currentUser?.id || 'unknown',
          name: currentUser?.name || 'Anonymous',
          email: currentUser?.email || 'anonymous@example.com',
          role: currentUser?.role || 'USER'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        commentsCount: 0,
        likesCount: 0
      };
      
      setPosts(prev => [optimisticPost, ...prev]);
      
      // Then create real post
      const newPost = await apiService.createPost(postData);
      
      // Replace optimistic post with real one
      setPosts(prev => [newPost.data, ...prev.slice(1)]);
      
    } catch (err) {
      console.error('Failed to create post:', err);
      setError('Failed to create post. Please try again.');
      
      // Remove optimistic post on error
      setPosts(prev => prev.slice(1));
    }
  };

  const sidebarProps = {
    search: query.search,
    onSearchChange: updateSearch,
    selectedTags: query.selectedTags,
    onToggleTag: toggleTag,
    sortBy: query.sortBy,
    onSortChange: updateSort,
  };

  return (
    <Layout sidebarProps={sidebarProps}>
      <div className="space-y-6">
        {/* Connection Status Indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-slate-600">
              {isConnected ? 'Live' : 'Reconnecting...'}
            </span>
          </div>
          <div className="text-xs text-slate-500">
            {posts.length} posts
          </div>
        </div>

        {/* Post Composer */}
        <PostComposer onSubmit={handleCreatePost} />

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-800 text-sm">{error}</div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-slate-200 p-6 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-3"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        )}

        {/* Posts List */}
        {!loading && posts.length > 0 && (
          <PostList 
            posts={posts} 
            realtimeActivity={activity}
            search={query.search}
          />
        )}

        {/* Empty State */}
        {!loading && posts.length === 0 && !error && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No posts found</h3>
            <p className="text-slate-600 mb-4">
              {query.search || query.selectedTags.length > 0 
                ? 'Try adjusting your search or filters' 
                : 'Be the first to share something with the community!'}
            </p>
            {(query.search || query.selectedTags.length > 0) && (
              <button 
                onClick={() => {
                  updateSearch('');
                  query.selectedTags.forEach(tag => toggleTag(tag));
                }}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
