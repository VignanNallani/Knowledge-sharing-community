import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Grid, 
  List, 
  ChevronDown, 
  ChevronUp,
  Calendar,
  User,
  Heart,
  MessageCircle,
  Star,
  Clock,
  TrendingUp,
  Users,
  FileText
} from 'lucide-react';
import { searchPosts, searchUsers, searchMentors, formatSearchResult } from '../../services/searchAPI';

const SearchResults = ({ initialQuery = '', initialType = 'all' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(initialQuery || searchParams.get('q') || '');
  const [searchType, setSearchType] = useState(initialType || searchParams.get('type') || 'all');
  const [results, setResults] = useState({ posts: [], users: [], mentors: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [filters, setFilters] = useState({
    skills: [],
    dateRange: { start: '', end: '' },
    role: '',
    availability: '',
    minRating: 1,
    maxRating: 5
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  // Perform search
  const performSearch = async (searchQuery, type, page = 1) => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const searchParams = {
        q: searchQuery,
        page,
        limit: pagination.limit,
        sortBy
      };

      // Add filters based on type
      if (type === 'posts' || type === 'all') {
        searchParams.skills = filters.skills;
        if (filters.dateRange.start) searchParams.dateStart = filters.dateRange.start;
        if (filters.dateRange.end) searchParams.dateEnd = filters.dateRange.end;
      }

      if (type === 'users' || type === 'all') {
        searchParams.role = filters.role;
        searchParams.skills = filters.skills;
      }

      if (type === 'mentors' || type === 'all') {
        searchParams.skills = filters.skills;
        searchParams.availability = filters.availability;
        searchParams.minRating = filters.minRating;
        searchParams.maxRating = filters.maxRating;
      }

      const promises = [];
      
      if (type === 'posts' || type === 'all') {
        promises.push(searchPosts(searchParams).then(data => ({ type: 'posts', data })));
      }
      
      if (type === 'users' || type === 'all') {
        promises.push(searchUsers(searchParams).then(data => ({ type: 'users', data })));
      }
      
      if (type === 'mentors' || type === 'all') {
        promises.push(searchMentors(searchParams).then(data => ({ type: 'mentors', data })));
      }

      const results = await Promise.all(promises);
      
      const newResults = { posts: [], users: [], mentors: [] };
      let totalResults = 0;

      results.forEach(({ type, data }) => {
        newResults[type] = data[type] || [];
        totalResults += data.pagination?.total || 0;
      });

      setResults(newResults);
      setPagination(prev => ({
        ...prev,
        page,
        total: totalResults,
        pages: Math.ceil(totalResults / pagination.limit)
      }));

    } catch (err) {
      setError(err.response?.data?.error || 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Initial search and query changes
  useEffect(() => {
    if (query) {
      performSearch(query, searchType, pagination.page);
    }
  }, [query, searchType, sortBy, pagination.page]);

  // Handle search type change
  const handleTypeChange = (newType) => {
    setSearchType(newType);
    setSearchParams({ q: query, type: newType });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle sort change
  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Render post card
  const renderPostCard = (post, isListView = false) => {
    const formattedPost = formatSearchResult(post, query);
    
    if (isListView) {
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start space-x-4">
            <div className="flex-1 min-w-0">
              <Link to={`/post/${post.id}`} className="block">
                <h3 
                  className="text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors"
                  dangerouslySetInnerHTML={{ __html: formattedPost.highlightedTitle }}
                />
              </Link>
              <p 
                className="text-sm text-gray-600 mt-1 line-clamp-2"
                dangerouslySetInnerHTML={{ __html: formattedPost.highlightedContent }}
              />
              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <User className="w-3 h-3" />
                  <span>{post.author?.name}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Heart className="w-3 h-3" />
                  <span>{post._count?.likes || 0}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MessageCircle className="w-3 h-3" />
                  <span>{post._count?.comments || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
        <Link to={`/post/${post.id}`}>
          {post.image && (
            <div className="aspect-w-16 aspect-h-9 bg-gray-100">
              <img 
                src={post.image} 
                alt={post.title}
                className="w-full h-48 object-cover"
              />
            </div>
          )}
          <div className="p-4">
            <h3 
              className="text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors line-clamp-2"
              dangerouslySetInnerHTML={{ __html: formattedPost.highlightedTitle }}
            />
            <p 
              className="text-sm text-gray-600 mt-2 line-clamp-3"
              dangerouslySetInnerHTML={{ __html: formattedPost.highlightedContent }}
            />
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center space-x-2">
                <img 
                  src={post.author?.profileImage || `https://ui-avatars.com/api/?name=${post.author?.name}&background=random`} 
                  alt={post.author?.name}
                  className="w-6 h-6 rounded-full"
                />
                <span className="text-xs text-gray-500">{post.author?.name}</span>
              </div>
              <div className="flex items-center space-x-3 text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <Heart className="w-3 h-3" />
                  <span>{post._count?.likes || 0}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MessageCircle className="w-3 h-3" />
                  <span>{post._count?.comments || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>
    );
  };

  // Render user card
  const renderUserCard = (user, isListView = false) => {
    const formattedUser = formatSearchResult(user, query);
    
    if (isListView) {
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-4">
            <img 
              src={user.profileImage || `https://ui-avatars.com/api/?name=${user.name}&background=random`} 
              alt={user.name}
              className="w-12 h-12 rounded-full"
            />
            <div className="flex-1 min-w-0">
              <Link to={`/profile/${user.id}`} className="block">
                <h3 
                  className="text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors"
                  dangerouslySetInnerHTML={{ __html: formattedUser.highlightedName }}
                />
              </Link>
              <p className="text-sm text-gray-600">{user.role}</p>
              {user.skills && (
                <p className="text-xs text-gray-500 mt-1">{user.skills}</p>
              )}
              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                <span>{user._count?.posts || 0} posts</span>
                <span>{user._count?.followers || 0} followers</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div className="text-center">
          <img 
            src={user.profileImage || `https://ui-avatars.com/api/?name=${user.name}&background=random`} 
            alt={user.name}
            className="w-20 h-20 rounded-full mx-auto mb-4"
          />
          <Link to={`/profile/${user.id}`}>
            <h3 
              className="text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors"
              dangerouslySetInnerHTML={{ __html: formattedUser.highlightedName }}
            />
          </Link>
          <p className="text-sm text-gray-600 mt-1">{user.role}</p>
          {user.bio && (
            <p 
              className="text-sm text-gray-500 mt-2 line-clamp-2"
              dangerouslySetInnerHTML={{ __html: formattedUser.highlightedBio }}
            />
          )}
          {user.skills && (
            <div className="mt-3">
              <div className="flex flex-wrap gap-1 justify-center">
                {user.skills.split(',').slice(0, 3).map((skill, index) => (
                  <span 
                    key={index}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full"
                  >
                    {skill.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center justify-center space-x-4 mt-4 text-xs text-gray-500">
            <span>{user._count?.posts || 0} posts</span>
            <span>{user._count?.followers || 0} followers</span>
          </div>
        </div>
      </div>
    );
  };

  // Render mentor card
  const renderMentorCard = (mentor, isListView = false) => {
    const formattedMentor = formatSearchResult(mentor, query);
    
    if (isListView) {
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-4">
            <img 
              src={mentor.profileImage || `https://ui-avatars.com/api/?name=${mentor.name}&background=random`} 
              alt={mentor.name}
              className="w-12 h-12 rounded-full"
            />
            <div className="flex-1 min-w-0">
              <Link to={`/mentor/${mentor.id}`} className="block">
                <h3 
                  className="text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors"
                  dangerouslySetInnerHTML={{ __html: formattedMentor.highlightedName }}
                />
              </Link>
              <div className="flex items-center space-x-2 mt-1">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${
                        i < Math.floor(mentor.averageRating || 0)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="text-xs text-gray-500 ml-1">
                    ({mentor.averageRating || 0})
                  </span>
                </div>
              </div>
              {mentor.skills && (
                <p className="text-xs text-gray-500 mt-1">{mentor.skills}</p>
              )}
              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                <span>{mentor.totalSessions || 0} sessions</span>
                <span>{mentor.totalFollowers || 0} followers</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div className="text-center">
          <img 
            src={mentor.profileImage || `https://ui-avatars.com/api/?name=${mentor.name}&background=random`} 
            alt={mentor.name}
            className="w-20 h-20 rounded-full mx-auto mb-4"
          />
          <Link to={`/mentor/${mentor.id}`}>
            <h3 
              className="text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors"
              dangerouslySetInnerHTML={{ __html: formattedMentor.highlightedName }}
            />
          </Link>
          <div className="flex items-center justify-center space-x-2 mt-1">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.floor(mentor.averageRating || 0)
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-300'
                  }`}
                />
              ))}
              <span className="text-sm text-gray-500 ml-1">
                ({mentor.averageRating || 0})
              </span>
            </div>
          </div>
          {mentor.bio && (
            <p 
              className="text-sm text-gray-500 mt-2 line-clamp-2"
              dangerouslySetInnerHTML={{ __html: formattedMentor.highlightedBio }}
            />
          )}
          {mentor.skills && (
            <div className="mt-3">
              <div className="flex flex-wrap gap-1 justify-center">
                {mentor.skills.split(',').slice(0, 3).map((skill, index) => (
                  <span 
                    key={index}
                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full"
                  >
                    {skill.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center justify-center space-x-4 mt-4 text-xs text-gray-500">
            <span>{mentor.totalSessions || 0} sessions</span>
            <span>{mentor.totalFollowers || 0} followers</span>
          </div>
          <button className="mt-4 w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
            Book Session
          </button>
        </div>
      </div>
    );
  };

  // Render all results
  const renderAllResults = () => {
    const allResults = [
      ...(results.posts || []).map(post => ({ ...post, type: 'post' })),
      ...(results.users || []).map(user => ({ ...user, type: 'user' })),
      ...(results.mentors || []).map(mentor => ({ ...mentor, type: 'mentor' }))
    ];

    if (viewMode === 'list') {
      return (
        <div className="space-y-4">
          {allResults.map((result, index) => {
            if (result.type === 'post') return renderPostCard(result, true);
            if (result.type === 'user') return renderUserCard(result, true);
            if (result.type === 'mentor') return renderMentorCard(result, true);
            return null;
          })}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allResults.map((result, index) => {
          if (result.type === 'post') return renderPostCard(result, false);
          if (result.type === 'user') return renderUserCard(result, false);
          if (result.type === 'mentor') return renderMentorCard(result, false);
          return null;
        })}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Search Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900">
            Search Results
            {query && <span className="text-lg font-normal text-gray-600 ml-2">for "{query}"</span>}
          </h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${
                viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${
                viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Type Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'all', label: 'All', icon: Search },
              { id: 'posts', label: 'Posts', icon: FileText },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'mentors', label: 'Mentors', icon: Star }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleTypeChange(id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  searchType === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Filters and Sort */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="relevance">Most Relevant</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="most_liked">Most Liked</option>
            <option value="most_commented">Most Commented</option>
          </select>
        </div>

        <div className="text-sm text-gray-600">
          {pagination.total > 0 ? (
            <span>{pagination.total} results found</span>
          ) : (
            <span>No results found</span>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Skills Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
              <input
                type="text"
                placeholder="Enter skills..."
                value={filters.skills.join(', ')}
                onChange={(e) => handleFilterChange('skills', e.target.value.split(',').map(s => s.trim()))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, start: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, end: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Role Filter */}
            {(searchType === 'users' || searchType === 'all') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={filters.role}
                  onChange={(e) => handleFilterChange('role', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Roles</option>
                  <option value="USER">User</option>
                  <option value="MENTOR">Mentor</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">
            <Search className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Search Error</h3>
          <p className="text-gray-600">{error}</p>
        </div>
      )}

      {/* Results */}
      {!loading && !error && (
        <>
          {renderAllResults()}
          
          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="mt-8 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} results
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-1 rounded text-sm ${
                          pagination.page === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SearchResults;
