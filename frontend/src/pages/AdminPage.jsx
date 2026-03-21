import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

export default function AdminPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      navigate('/community')
      return
    }

    const fetchData = async () => {
      try {
        const [usersRes, postsRes] = await Promise.all([
          api.get('/users'),
          api.get('/posts')
        ])
        
        const usersData = usersRes.data.data?.users || usersRes.data.data || usersRes.data.users || usersRes.data || []
        const postsData = postsRes.data.data?.posts || postsRes.data.data || postsRes.data.posts || postsRes.data || []
        
        setUsers(Array.isArray(usersData) ? usersData : [])
        setPosts(Array.isArray(postsData) ? postsData : [])
      } catch (err) {
        console.error('Admin data fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, navigate])

  const totalUsers = users.length
  const totalPosts = posts.length
  const activeMentors = users.filter(u => u.role === 'MENTOR').length

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0F1E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#F9FAFB' }}>Loading admin dashboard...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0F1E', color: '#F9FAFB', fontFamily: 'DM Sans, sans-serif', display: 'flex' }}>
      {/* Sidebar */}
      <div style={{ width: '250px', background: '#1A2235', borderRight: '1px solid #1F2A40', padding: '24px 0' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'Plus Jakarta Sans, sans-serif', marginBottom: '24px', color: '#60A5FA' }}>
          🛡️ Admin
        </h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'users', label: 'Users', icon: '👥' },
            { id: 'posts', label: 'Posts', icon: '📝' },
            { id: 'reports', label: 'Reports', icon: '📈' },
            { id: 'settings', label: 'Settings', icon: '⚙️' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 16px',
                background: activeTab === tab.id ? '#3B82F6' : 'transparent',
                color: activeTab === tab.id ? 'white' : '#9CA3AF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'background 0.2s'
              }}
            >
              <span style={{ marginRight: '8px' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        {activeTab === 'overview' && (
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', fontFamily: 'Plus Jakarta Sans, sans-serif', marginBottom: '8px' }}>
              📊 Dashboard Overview
            </h1>
            <p style={{ color: '#9CA3AF', marginBottom: '32px' }}>
              System statistics and user activity
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
              <div style={{ background: '#1A2235', border: '1px solid #1F2A40', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: '800', fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#60A5FA', marginBottom: '8px' }}>
                  {totalUsers}
                </div>
                <div style={{ fontSize: '14px', color: '#6B7280' }}>Total Users</div>
              </div>
              <div style={{ background: '#1A2235', border: '1px solid #1F2A40', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: '800', fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#60A5FA', marginBottom: '8px' }}>
                  {totalPosts}
                </div>
                <div style={{ fontSize: '14px', color: '#6B7280' }}>Total Posts</div>
              </div>
              <div style={{ background: '#1A2235', border: '1px solid #1F2A40', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: '800', fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#60A5FA', marginBottom: '8px' }}>
                  {activeMentors}
                </div>
                <div style={{ fontSize: '14px', color: '#6B7280' }}>Active Mentors</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', fontFamily: 'Plus Jakarta Sans, sans-serif', marginBottom: '8px' }}>
              👥 Users Management
            </h1>
            <p style={{ color: '#9CA3AF', marginBottom: '32px' }}>
              View and manage all registered users
            </p>

            <div style={{ background: '#1A2235', border: '1px solid #1F2A40', borderRadius: '16px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#111827' }}>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Name
                    </th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Email
                    </th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Role
                    </th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Joined
                    </th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} style={{ borderBottom: '1px solid #1F2A40' }}>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#F9FAFB' }}>
                        {user.name}
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#9CA3AF' }}>
                        {user.email}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          padding: '4px 8px',
                          background: user.role === 'ADMIN' ? '#EF4444' : user.role === 'MENTOR' ? '#3B82F6' : '#10B981',
                          color: 'white',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          {user.role}
                        </span>
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#9CA3AF' }}>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <button style={{
                          padding: '6px 12px',
                          background: '#374151',
                          color: '#9CA3AF',
                          border: '1px solid #4B5563',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          marginRight: '8px'
                        }}>
                          Edit
                        </button>
                        <button style={{
                          padding: '6px 12px',
                          background: '#EF4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'posts' && (
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', fontFamily: 'Plus Jakarta Sans, sans-serif', marginBottom: '8px' }}>
              📝 Posts Management
            </h1>
            <p style={{ color: '#9CA3AF', marginBottom: '32px' }}>
              View and manage all posts
            </p>
            <div style={{ textAlign: 'center', padding: '60px', color: '#6B7280' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📝</div>
              <div>Posts management coming soon...</div>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', fontFamily: 'Plus Jakarta Sans, sans-serif', marginBottom: '8px' }}>
              📈 Reports & Analytics
            </h1>
            <p style={{ color: '#9CA3AF', marginBottom: '32px' }}>
              System reports and usage analytics
            </p>
            <div style={{ textAlign: 'center', padding: '60px', color: '#6B7280' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📈</div>
              <div>Reports coming soon...</div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', fontFamily: 'Plus Jakarta Sans, sans-serif', marginBottom: '8px' }}>
              ⚙️ Admin Settings
            </h1>
            <p style={{ color: '#9CA3AF', marginBottom: '32px' }}>
              Configure system settings and preferences
            </p>
            <div style={{ textAlign: 'center', padding: '60px', color: '#6B7280' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>⚙️</div>
              <div>Settings panel coming soon...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
