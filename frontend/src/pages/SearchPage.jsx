import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const q = searchParams.get('q') || '';
  const [query, setQuery] = useState(q);
  const [results, setResults] = useState({ posts: [], users: [] });
  const [activeTab, setActiveTab] = useState('posts');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q || q.trim().length < 2) return;
    setLoading(true);
    api.get(`/search?q=${encodeURIComponent(q)}`)
      .then(res => setResults(res.data.data || { posts: [], users: [] }))
      .catch(() => setResults({ posts: [], users: [] }))
      .finally(() => setLoading(false));
  }, [q]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const roleColor = (role) => {
    if (role === 'ADMIN') return '#f59e0b';
    if (role === 'MENTOR') return '#6366f1';
    return '#10b981';
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f1117', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>
      {/* Search Header */}
      <div style={{ background: '#1a1d2e', borderBottom: '1px solid #2d3148', padding: '32px 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20, color: '#fff' }}>Search DevMentor</h1>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12 }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search posts, users, topics..."
              style={{
                flex: 1, padding: '12px 20px', borderRadius: 10,
                background: '#0f1117', border: '1px solid #2d3148',
                color: '#e2e8f0', fontSize: 16, outline: 'none'
              }}
              autoFocus
            />
            <button type="submit" style={{
              padding: '12px 28px', borderRadius: 10, border: 'none',
              background: '#6366f1', color: '#fff', fontSize: 15,
              fontWeight: 600, cursor: 'pointer'
            }}>Search</button>
          </form>
        </div>
      </div>

      {/* Results */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px' }}>
        {q && (
          <p style={{ color: '#94a3b8', marginBottom: 24, fontSize: 14 }}>
            Showing results for <span style={{ color: '#fff', fontWeight: 600 }}>"{q}"</span>
          </p>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {['posts', 'users'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '8px 22px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: 14, transition: 'all 0.15s',
              background: activeTab === tab ? '#6366f1' : '#1a1d2e',
              color: activeTab === tab ? '#fff' : '#94a3b8',
              border: activeTab === tab ? 'none' : '1px solid #2d3148'
            }}>
              {tab === 'posts' ? '📄 Posts' : '👤 Users'}
              <span style={{
                marginLeft: 8, background: activeTab === tab ? 'rgba(255,255,255,0.2)' : '#0f1117',
                borderRadius: 12, padding: '1px 8px', fontSize: 12
              }}>
                {tab === 'posts' ? results.posts.length : results.users.length}
              </span>
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: '#6366f1', fontSize: 16 }}>Searching...</div>
        )}

        {/* Posts Tab */}
        {!loading && activeTab === 'posts' && (
          results.posts.length === 0
            ? <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                <p>No posts found{q ? ` for "${q}"` : ''}</p>
              </div>
            : results.posts.map(post => (
              <Link to={`/posts/${post.id}`} key={post.id} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: '#1a1d2e', border: '1px solid #2d3148', borderRadius: 12,
                  padding: '20px 24px', marginBottom: 16, cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }} onMouseEnter={e => e.currentTarget.style.borderColor='#6366f1'}
                   onMouseLeave={e => e.currentTarget.style.borderColor='#2d3148'}>
                  <h3 style={{ color: '#fff', fontSize: 17, fontWeight: 600, marginBottom: 8 }}>{post.title}</h3>
                  <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>
                    {post.content?.slice(0, 150)}{post.content?.length > 150 ? '...' : ''}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', background: '#6366f1',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, color: '#fff'
                    }}>{post.author?.name?.[0]?.toUpperCase()}</div>
                    <span style={{ color: '#cbd5e1', fontSize: 13 }}>{post.author?.name}</span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6,
                      background: 'rgba(99,102,241,0.15)', color: roleColor(post.author?.role) }}>
                      {post.author?.role}
                    </span>
                    <span style={{ marginLeft: 'auto', color: '#475569', fontSize: 13 }}>
                      ❤️ {post._count?.likes || 0} · 💬 {post._count?.comments || 0}
                    </span>
                  </div>
                </div>
              </Link>
            ))
        )}

        {/* Users Tab */}
        {!loading && activeTab === 'users' && (
          results.users.length === 0
            ? <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
                <p>No users found{q ? ` for "${q}"` : ''}</p>
              </div>
            : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                {results.users.map(user => (
                  <Link to={`/profile/${user.id}`} key={user.id} style={{ textDecoration: 'none' }}>
                    <div style={{
                      background: '#1a1d2e', border: '1px solid #2d3148', borderRadius: 12,
                      padding: '24px 20px', textAlign: 'center', cursor: 'pointer',
                      transition: 'border-color 0.2s'
                    }} onMouseEnter={e => e.currentTarget.style.borderColor='#6366f1'}
                       onMouseLeave={e => e.currentTarget.style.borderColor='#2d3148'}>
                      <div style={{
                        width: 52, height: 52, borderRadius: '50%', background: '#6366f1',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 auto 12px'
                      }}>{user.name?.[0]?.toUpperCase()}</div>
                      <div style={{ color: '#fff', fontWeight: 600, marginBottom: 4 }}>{user.name}</div>
                      <div style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, display: 'inline-block',
                        background: 'rgba(99,102,241,0.15)', color: roleColor(user.role) }}>
                        {user.role}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
        )}
      </div>
    </div>
  );
}
