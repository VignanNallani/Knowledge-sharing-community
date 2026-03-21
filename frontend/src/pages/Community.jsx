import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import PostCard from "../components/PostCard"
import LoadingSkeleton from "../components/LoadingSkeleton"
import CreatePost from "../components/CreatePost"
import { useAuth } from "../context/AuthContext"
import api from "../lib/api"
import { io } from 'socket.io-client'

export default function Community() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newPost, setNewPost] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [posting, setPosting] = useState(false);
  const [selectedTab, setSelectedTab] = useState('latest');
  const [stats, setStats] = useState({
    members: 0,
    posts: 0,
    onlineNow: 0,
    questionsAnswered: 0
  });
  const navigate = useNavigate();

  // Socket.IO connection
  useEffect(() => {
    const socket = io('http://localhost:4000');
    
    socket.on('new_post', (post) => {
      setPosts(prev => [post, ...prev]);
    });
    
    return () => socket.disconnect();
  }, []);

  // Fetch stats data
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, postsRes] = await Promise.all([
          api.get('/users'),
          api.get('/posts')
        ]);
        
        setStats({
          members: usersRes.data.data?.total || 0,
          posts: postsRes.data.data?.pagination?.total || 0,
          onlineNow: usersRes.data.data?.total || 0,
          questionsAnswered: postsRes.data.data?.pagination?.total || 0
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };
    
    fetchStats();
  }, []);

  // Real trending posts
  const [trendingPosts, setTrendingPosts] = useState([]);
  const [topMentors, setTopMentors] = useState([]);
  const [userStats, setUserStats] = useState({ posts: 0, points: 0 });

  // Fetch trending posts
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const res = await api.get('/posts?limit=5&sort=likes');
        const posts = res.data.data?.posts || res.data.data || [];
        setTrendingPosts(Array.isArray(posts) ? posts : []);
      } catch (error) {
        console.error('Failed to fetch trending posts:', error);
        setTrendingPosts([]);
      }
    };
    
    fetchTrending();
  }, []);

  // Fetch top mentors
  useEffect(() => {
    const fetchMentors = async () => {
      try {
        console.log('🔍 Fetching mentors...');
        const res = await api.get('/users?limit=52');
        const allUsers = res.data.data?.users || [];
        console.log('ROLES:', allUsers.map(u => u.role));
        const mentorOnly = allUsers.filter(u => u.role === 'MENTOR');
        console.log('MENTORS FOUND:', mentorOnly.length);
        setTopMentors(mentorOnly.slice(0, 3));
      } catch (error) {
        console.error('❌ Failed to fetch mentors:', error);
        setTopMentors([]);
      }
    };
    
    fetchMentors();
  }, []);

  // Fetch user stats
  useEffect(() => {
    const fetchUserStats = async () => {
      if (!user?.id) return;
      
      try {
        const res = await api.get(`/posts?authorId=${user.id}`);
        const posts = res.data.data?.posts || res.data.data || [];
        setUserStats({
          posts: posts.length,
          points: posts.length * 100 // Simple points calculation
        });
      } catch (error) {
        console.error('Failed to fetch user stats:', error);
      }
    };
    
    if (user) fetchUserStats();
  }, [user]);

  // Fetch real posts
  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/posts');
      console.log('✅ Posts raw response:', res);
      console.log('✅ Posts data:', res.data);
      const posts = res.data.data?.posts || [];
      console.log('✅ Parsed posts array:', posts);
      setPosts(Array.isArray(posts) ? posts : []);
    } catch (err) {
      console.error('❌ Posts error status:', 
        err.response?.status);
      console.error('❌ Posts error data:', 
        err.response?.data);
      console.error('❌ Full error:', err.message);
      setError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  // Create real post
  const handlePost = async () => {
    if (!newPost.trim() || posting) return;
    try {
      setPosting(true);
      const res = await api.post('/posts', {
        title: postTitle || newPost.substring(0, 50),
        content: newPost,
        type: selectedTab.toUpperCase() || 'DISCUSSION'
      });
      const created = res.data.data?.post 
        || res.data.data 
        || res.data.post 
        || res.data;
      if (created) {
        setPosts(prev => [created, ...prev]);
        setNewPost('');
        setPostTitle('');
        // Show success message briefly
        const successMsg = document.createElement('div');
        successMsg.textContent = '✅ Post created successfully!';
        successMsg.style.cssText = `
          position: fixed; top: 20px; right: 20px; 
          background: linear-gradient(135deg, #10B981, #059669);
          color: white; padding: 12px 20px; border-radius: 8px;
          font-weight: 600; z-index: 9999; 
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          animation: slideIn 0.3s ease-out;
        `;
        document.body.appendChild(successMsg);
        setTimeout(() => document.body.removeChild(successMsg), 3000);
      }
    } catch (err) {
      console.error('Create post error:', err);
      alert(err.response?.data?.message || 'Failed to post');
    } finally {
      setPosting(false);
    }
  };

  // Real like functionality  
  const handleLike = async (postId) => {
  try {
    const res = await api.post(
      `/posts/${postId}/like` 
    )
    // Update post in state optimistically
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const wasLiked = res.data.liked
        return {
          ...p,
          likesCount: wasLiked 
            ? (p.likesCount || 0) + 1 
            : Math.max((p.likesCount || 0) - 1, 0),
          likedByMe: wasLiked
        }
      }
      return p
    }))
  } catch (error) {
    console.error('Like error:', error)
  }
};

  const timeAgo = (date) => {
    const seconds = Math.floor(
      (new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) 
      return Math.floor(seconds/60) + 'm ago';
    if (seconds < 86400) 
      return Math.floor(seconds/3600) + 'h ago';
    return Math.floor(seconds/86400) + 'd ago';
  };

  const getInitials = (name) => {
    return name?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase().slice(0, 2) || 'U';
  };

  const getAvatarColor = (name) => {
    const colors = [
      'from-blue-400 to-purple-500',
      'from-green-400 to-teal-500', 
      'from-orange-400 to-red-500',
      'from-pink-400 to-rose-500',
      'from-indigo-400 to-blue-500'
    ];
    const index = name?.charCodeAt(0) % colors.length || 0;
    return colors[index];
  };

  const getRoleBadge = (role) => {
    if (role === 'ADMIN') {
      return { label: 'Admin', color: 'bg-purple-500' };
    } else if (role === 'MENTOR') {
      return { label: 'Mentor', color: 'bg-blue-500' };
    } else {
      return { label: 'Member', color: 'bg-gray-500' };
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <h2 className="font-heading font-bold text-3xl text-white mb-2">Sign In Required</h2>
          <p className="text-[#9CA3AF] mb-6">Please sign in to view and participate in community discussions.</p>
          <button 
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-[#3B82F6] text-white rounded-lg font-semibold hover:bg-[#2563EB] transition-colors duration-200"
          >
            Sign In →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0F1E]">
      {/* Header Section */}
      <div className="bg-[#1A2235] border-b border-[#2D3748] px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading font-bold text-4xl text-white mb-2">Community</h1>
              <p className="text-[#9CA3AF] text-lg">Share knowledge, ask questions, grow together</p>
            </div>
            
            {/* Stats Pills */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 px-4 py-2 bg-[#1E293B] rounded-full">
                <span className="text-orange-400 text-lg">🔥</span>
                <span className="text-white font-semibold">{stats.posts}</span>
                <span className="text-[#9CA3AF] text-sm">Posts</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-[#1E293B] rounded-full">
                <span className="text-blue-400 text-lg">👥</span>
                <span className="text-white font-semibold">{stats.members}</span>
                <span className="text-[#9CA3AF] text-sm">Members</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-[#10B981F] rounded-full">
                <span className="text-green-400 text-lg">✅</span>
                <span className="text-white font-semibold">{stats.questionsAnswered}</span>
                <span className="text-[#9CA3AF] text-sm">Questions</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-[#3B82F6] rounded-full relative">
                <span className="text-white text-lg">⚡</span>
                <span className="text-white font-semibold">{stats.onlineNow}</span>
                <span className="text-[#9CA3AF] text-sm">Online Now</span>
                <div className="absolute top-0 right-0 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Sidebar - Categories */}
          <div className="lg:col-span-3 space-y-6">
            {/* Categories */}
            <div className="bg-[#1A2235] border border-[#2D3748] rounded-2xl p-6">
              <h3 className="font-heading font-semibold text-white text-lg mb-4">Categories</h3>
              <div className="space-y-2">
                {['General', 'React', 'Node.js', 'Python', 'DevOps', 'Career'].map((category) => (
                  <button
                    key={category}
                    className="w-full text-left px-4 py-3 text-[#9CA3AF] hover:bg-[#2D3748] hover:text-white rounded-lg transition-colors duration-200"
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Your Stats */}
            <div className="bg-[#1A2235] border border-[#2D3748] rounded-2xl p-6">
              <h3 className="font-heading font-semibold text-white text-lg mb-4">Your Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-[#9CA3AF]">
                  <span>Points</span>
                  <span className="text-white font-semibold">{userStats.points}</span>
                </div>
                <div className="flex justify-between text-[#9CA3AF]">
                  <span>Posts</span>
                  <span className="text-white font-semibold">{userStats.posts}</span>
                </div>
                <div className="flex justify-between text-[#9CA3AF]">
                  <span>Rank</span>
                  <span className="text-white font-semibold">Coming soon</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Create Post Box */}
            <div className="bg-[#1A2235] border border-[#2D3748] rounded-2xl p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarColor(user?.name)} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
                  {getInitials(user?.name)}
                </div>
                <div className="flex-1">
                  {/* Post Type Tabs */}
                  <div className="flex gap-2 mb-4">
                    {['Discussion', 'Question', 'Tutorial', 'Challenge'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setSelectedTab(type)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                          selectedTab === type
                            ? 'bg-[#3B82F6] text-white'
                            : 'text-[#9CA3AF] hover:bg-[#2D3748]'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  
                  {/* Title Input */}
                  <input
                    type="text"
                    value={postTitle}
                    onChange={e => setPostTitle(e.target.value)}
                    placeholder="Give your post a title..."
                    maxLength={100}
                    className="w-full bg-[#0F172A] border border-[#2D3748] rounded-xl p-4 text-white placeholder-[#6B7280] focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[rgba(59,130,246,0.1)] transition-all duration-200 mb-4"
                  />
                  
                  {/* Textarea */}
                  <textarea
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    placeholder={`Share something with the community...`}
                    className="w-full h-32 bg-[#0F172A] border border-[#2D3748] rounded-xl p-4 text-white placeholder-[#6B7280] resize-none focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[rgba(59,130,246,0.1)] transition-all duration-200"
                  />
                  
                  {/* Bottom Toolbar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[#6B7280] text-sm">
                      <span>{newPost.length}/500</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-[#6B7280] hover:text-white hover:bg-[#2D3748] rounded-lg transition-colors duration-200">
                        📎 Attach
                      </button>
                      <button className="p-2 text-[#6B7280] hover:text-white hover:bg-[#2D3748] rounded-lg transition-colors duration-200">
                        🖼️ Image
                      </button>
                      <button className="p-2 text-[#6B7280] hover:text-white hover:bg-[#2D3748] rounded-lg transition-colors duration-200">
                        💻 Code
                      </button>
                      <button className="p-2 text-[#6B7280] hover:text-white hover:bg-[#2D3748] rounded-lg transition-colors duration-200">
                        🏷️ Tag
                      </button>
                    </div>
                    
                    <button
                      onClick={handlePost}
                      disabled={!newPost.trim() || posting}
                      className="px-6 py-3 bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white font-semibold rounded-lg hover:from-[#2563EB] hover:to-[#1D4ED8] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {posting ? 'Posting...' : 'Post →'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Feed Tabs */}
            <div className="bg-[#1A2235] border border-[#2D3748] rounded-2xl p-1">
              <div className="flex gap-1">
                {['Latest', 'Top', 'Following', 'Unanswered'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSelectedTab(tab)}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors duration-200 ${
                      selectedTab === tab
                        ? 'bg-[#0F172A] text-white border-b-2 border-[#3B82F6]'
                        : 'text-[#6B7280] hover:bg-[#1E293B] border-b-2 border-transparent'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Posts List */}
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <LoadingSkeleton key={i} />)}
              </div>
            ) : error ? (
              <div className="bg-[#1A2235] border border-[#2D3748] rounded-2xl p-12 text-center">
                <div className="text-6xl mb-4">⚠️</div>
                <h3 className="font-heading font-semibold text-white text-xl mb-2">Something went wrong</h3>
                <p className="text-[#9CA3AF] mb-6">{error}</p>
                <button 
                  onClick={fetchPosts}
                  className="px-6 py-3 bg-[#3B82F6] text-white rounded-lg font-semibold hover:bg-[#2563EB] transition-colors duration-200"
                >
                  Try Again
                </button>
              </div>
            ) : posts.length === 0 ? (
              <div style={{textAlign:'center', padding:'60px 20px'}}>
                <div style={{fontSize:'64px'}}>💬</div>
                <h3>No posts yet. Be first!</h3>
                <p style={{color:'#9CA3AF'}}>
                  Share knowledge, ask a question, 
                  or start a discussion
                </p>
                <button onClick={() => 
                  document.querySelector('textarea').focus()
                }>
                  Create First Post →
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard 
                    key={post.id}
                    post={post}
                    timeAgo={timeAgo}
                    getInitials={getInitials}
                    getAvatarColor={getAvatarColor}
                    onLike={handleLike}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-3 space-y-6">
            {/* Trending Discussions */}
            <div className="bg-[#1A2235] border border-[#2D3748] rounded-2xl p-6">
              <h3 className="font-heading font-semibold text-white text-lg mb-4 flex items-center gap-2">
                <span className="text-orange-400">🔥</span> Trending
              </h3>
              <div className="space-y-3">
                {trendingPosts.map((post, index) => (
                  <div key={post.id} className="pb-3 border-b border-[#374151] last:border-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#2563EB] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 
                          className="text-white text-sm font-medium hover:text-[#3B82F6] transition-colors cursor-pointer mb-1"
                          onClick={() => navigate(`/posts/${post.id}`)}
                        >
                          {post.title?.length > 40 ? post.title.substring(0, 40) + '...' : post.title}
                        </h4>
                        <span className="text-[#6B7280] text-xs">{post.likesCount || 0} likes</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Mentors */}
            <div className="bg-[#1A2235] border border-[#2D3748] rounded-2xl p-6">
              <h3 className="font-heading font-semibold text-white text-lg mb-4 flex items-center gap-2">
                <span className="text-blue-400">🎓</span> Top Mentors
              </h3>
              <div className="space-y-3">
                {topMentors.map((mentor) => (
                  <div key={mentor.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(mentor.name)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                        {getInitials(mentor.name)}
                      </div>
                      <div>
                        <h4 className="text-white text-sm font-medium">{mentor.name}</h4>
                        <div className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${getRoleBadge(mentor.role).color}`}>
                          {getRoleBadge(mentor.role).label}
                        </div>
                      </div>
                    </div>
                    <button className="px-3 py-2 bg-[#3B82F6] text-white text-xs rounded-lg hover:bg-[#2563EB] transition-colors duration-200">
                      Book
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Popular Topics - Coming Soon */}
            <div className="bg-[#1A2235] border border-[#2D3748] rounded-2xl p-6">
              <h3 className="font-heading font-semibold text-white text-lg mb-4 flex items-center gap-2">
                <span className="text-purple-400">🏷️</span> Popular Topics
              </h3>
              <div className="text-center py-8">
                <span className="text-[#6B7280]">Coming soon...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
