import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

export default function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const searchRef = useRef(null)
  const notificationRef = useRef(null)
  const userRef = useRef(null)

  // Fetch notifications on mount and poll every 60 seconds
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications()
      
      const interval = setInterval(fetchNotifications, 60000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false)
        setSearchQuery('')
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationDropdownOpen(false)
      }
      if (userRef.current && !userRef.current.contains(event.target)) {
        setUserDropdownOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications?limit=10')
      setNotifications(res.data.data?.notifications || [])
      setUnreadCount(res.data.data?.unreadCount || 0)
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }

  const markAsRead = async (notificationId) => {
    try {
      await api.post(`/notifications/${notificationId}/read`)
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000)
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago'
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago'
    return Math.floor(seconds / 86400) + 'd ago'
  }

  const getInitials = (name) => {
    return name?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase().slice(0, 2) || 'U'
  }

  const getAvatarColor = (name) => {
    const colors = [
      'linear-gradient(135deg, #60A5FA, #8B5CF6)',
      'linear-gradient(135deg, #34D399, #14B8A6)', 
      'linear-gradient(135deg, #FB923C, #EF4444)',
      'linear-gradient(135deg, #EC4899, #F43F5E)',
      'linear-gradient(135deg, #6366F1, #3B82F6)'
    ]
    const index = name?.charCodeAt(0) % colors.length || 0
    return colors[index]
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchOpen(false)
      setSearchQuery('')
    }
  }

  return (
    <nav style={{ 
      position: 'sticky', 
      top: 0, 
      zIndex: 1000, 
      height: '64px', 
      background: 'rgba(10,15,30,0.85)', 
      backdropFilter: 'blur(20px)', 
      borderBottom: '1px solid #374151', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      padding: '0 24px' 
    }}>
      
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ 
          width: '32px', 
          height: '32px', 
          background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', 
          borderRadius: '8px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
          </svg>
        </div>
        <h1 style={{ 
          fontFamily: 'Plus Jakarta Sans, sans-serif', 
          fontWeight: 'bold', 
          fontSize: '20px', 
          color: 'white' 
        }}>
          DevMentor
        </h1>
      </div>

      {/* Navigation Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <Link 
          to="/community" 
          style={{ 
            color: '#9CA3AF', 
            textDecoration: 'none', 
            position: 'relative', 
            transition: 'color 0.2s' 
          }}
          onMouseEnter={(e) => e.target.style.color = '#F9FAFB'}
          onMouseLeave={(e) => e.target.style.color = '#9CA3AF'}
        >
          Community
          <span style={{ 
            position: 'absolute', 
            bottom: '-2px', 
            left: 0, 
            width: 0, 
            height: '2px', 
            background: '#3B82F6', 
            transition: 'width 0.2s' 
          }}></span>
        </Link>
        <Link 
          to="/mentors" 
          style={{ 
            color: '#9CA3AF', 
            textDecoration: 'none', 
            position: 'relative', 
            transition: 'color 0.2s' 
          }}
          onMouseEnter={(e) => e.target.style.color = '#F9FAFB'}
          onMouseLeave={(e) => e.target.style.color = '#9CA3AF'}
        >
          Mentors
          <span style={{ 
            position: 'absolute', 
            bottom: '-2px', 
            left: 0, 
            width: 0, 
            height: '2px', 
            background: '#3B82F6', 
            transition: 'width 0.2s' 
          }}></span>
        </Link>
        <Link 
          to="/learning-paths" 
          style={{ 
            color: '#9CA3AF', 
            textDecoration: 'none', 
            position: 'relative', 
            transition: 'color 0.2s' 
          }}
          onMouseEnter={(e) => e.target.style.color = '#F9FAFB'}
          onMouseLeave={(e) => e.target.style.color = '#9CA3AF'}
        >
          Learning Paths
          <span style={{ 
            position: 'absolute', 
            bottom: '-2px', 
            left: 0, 
            width: 0, 
            height: '2px', 
            background: '#3B82F6', 
            transition: 'width 0.2s' 
          }}></span>
        </Link>
        <Link 
          to="/events" 
          style={{ 
            color: '#9CA3AF', 
            textDecoration: 'none', 
            position: 'relative', 
            transition: 'color 0.2s' 
          }}
          onMouseEnter={(e) => e.target.style.color = '#F9FAFB'}
          onMouseLeave={(e) => e.target.style.color = '#9CA3AF'}
        >
          Events
          <span style={{ 
            position: 'absolute', 
            bottom: '-2px', 
            left: 0, 
            width: 0, 
            height: '2px', 
            background: '#3B82F6', 
            transition: 'width 0.2s' 
          }}></span>
        </Link>
      </div>

      {/* Right Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Search */}
        <div ref={searchRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            style={{
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: '#9CA3AF', 
              background: 'transparent', 
              border: 'none', 
              cursor: 'pointer', 
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.color = '#3B82F6'
              e.target.style.background = 'rgba(59,130,246,0.1)'
            }}
            onMouseLeave={(e) => {
              e.target.style.color = '#9CA3AF'
              e.target.style.background = 'transparent'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </button>

          {searchOpen && (
            <div style={{
              position: 'absolute', 
              right: 0, 
              top: '48px', 
              width: '320px', 
              background: '#1F2937', 
              border: '1px solid #374151', 
              borderRadius: '12px', 
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}>
              <form onSubmit={handleSearchSubmit} style={{ padding: '12px' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search posts, users..."
                  style={{
                    width: '100%', 
                    padding: '8px 12px', 
                    background: '#111827', 
                    border: '1px solid #374151', 
                    borderRadius: '8px', 
                    color: '#F9FAFB', 
                    outline: 'none'
                  }}
                  autoFocus
                />
                <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '8px' }}>Press Enter to search</p>
              </form>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div ref={notificationRef} style={{ position: 'relative' }}>
          <button 
            onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
            style={{
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: '#9CA3AF', 
              background: 'transparent', 
              border: 'none', 
              cursor: 'pointer', 
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.color = '#3B82F6'
              e.target.style.background = 'rgba(59,130,246,0.1)'
            }}
            onMouseLeave={(e) => {
              e.target.style.color = '#9CA3AF'
              e.target.style.background = 'transparent'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', 
                top: '-4px', 
                right: '-4px', 
                width: '20px', 
                height: '20px', 
                background: '#EF4444', 
                color: 'white', 
                fontSize: '12px', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center'
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          
          {notificationDropdownOpen && (
            <div style={{
              position: 'absolute', 
              right: 0, 
              top: '48px', 
              width: '320px', 
              background: '#1F2937', 
              border: '1px solid #374151', 
              borderRadius: '12px', 
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', 
              padding: '8px 0', 
              zIndex: 50
            }}>
              <div style={{ 
                padding: '8px 12px', 
                borderBottom: '1px solid #374151', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}>
                <h3 style={{ fontSize: '14px', fontWeight: '500', color: '#F9FAFB', margin: 0 }}>Notifications</h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    style={{ 
                      fontSize: '12px', 
                      color: '#3B82F6', 
                      background: 'transparent', 
                      border: 'none', 
                      cursor: 'pointer', 
                      textDecoration: 'underline' 
                    }}
                  >
                    Mark all read
                  </button>
                )}
              </div>
              
              <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 16px', color: '#9CA3AF' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔔</div>
                    <p style={{ margin: 0 }}>No notifications yet</p>
                  </div>
                ) : (
                  notifications.map(notification => (
                    <div 
                      key={notification.id}
                      style={{
                        padding: '8px 12px', 
                        cursor: 'pointer', 
                        transition: 'background 0.2s',
                        background: !notification.read ? 'rgba(59,130,246,0.1)' : 'transparent'
                      }}
                      onClick={() => {
                        if (!notification.read) {
                          markAsRead(notification.id)
                        }
                        if (notification.postId) {
                          navigate(`/posts/${notification.postId}`)
                          setNotificationDropdownOpen(false)
                        }
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#374151'}
                      onMouseLeave={(e) => e.target.style.background = !notification.read ? 'rgba(59,130,246,0.1)' : 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        {!notification.read && (
                          <div style={{ 
                            width: '8px', 
                            height: '8px', 
                            background: '#3B82F6', 
                            borderRadius: '50%', 
                            marginTop: '4px' 
                          }}></div>
                        )}
                        <div style={{ flex: 1 }}>
                          <p style={{ 
                            fontSize: '14px', 
                            color: '#F9FAFB', 
                            margin: '0 0 4px 0' 
                          }}>
                            {notification.message}
                          </p>
                          <p style={{ 
                            fontSize: '12px', 
                            color: '#9CA3AF', 
                            margin: 0 
                          }}>
                            {timeAgo(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Auth Section */}
        {isAuthenticated ? (
          <>
            {/* User Avatar with Dropdown */}
            <div ref={userRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                style={{
                  width: '36px', 
                  height: '36px', 
                  borderRadius: '50%', 
                  background: getAvatarColor(user?.name), 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: 'white', 
                  fontWeight: '600', 
                  cursor: 'pointer', 
                  border: 'none', 
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.boxShadow = '0 0 0 2px #3B82F6'}
                onMouseLeave={(e) => e.target.style.boxShadow = 'none'}
              >
                {getInitials(user?.name)}
              </button>
              
              {userDropdownOpen && (
                <div style={{
                  position: 'absolute', 
                  right: 0, 
                  top: '44px', 
                  width: '192px', 
                  background: '#1F2937', 
                  border: '1px solid #374151', 
                  borderRadius: '12px', 
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', 
                  padding: '8px 0'
                }}>
                  <div style={{ 
                    padding: '8px 12px', 
                    borderBottom: '1px solid #374151' 
                  }}>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: '500', 
                      color: '#F9FAFB', 
                      marginBottom: '4px' 
                    }}>
                      {user?.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                      {user?.email}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      navigate('/profile')
                      setUserDropdownOpen(false)
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'transparent',
                      border: 'none',
                      color: '#F9FAFB',
                      cursor: 'pointer',
                      fontSize: '14px',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      borderRadius: '4px',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    👤 Profile
                  </button>
                  
                  <button
                    onClick={() => {
                      navigate('/my-bookings')
                      setUserDropdownOpen(false)
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'transparent',
                      border: 'none',
                      color: '#F9FAFB',
                      cursor: 'pointer',
                      fontSize: '14px',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      borderRadius: '4px',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    � My Bookings
                  </button>
                  
                  <button
                    onClick={() => {
                      navigate('/leaderboard')
                      setUserDropdownOpen(false)
                    }}
                    style={{
                      width: '100%', 
                      padding: '8px 12px', 
                      textAlign: 'left', 
                      fontSize: '14px', 
                      color: '#9CA3AF', 
                      background: 'transparent', 
                      border: 'none', 
                      cursor: 'pointer', 
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.color = '#F9FAFB'
                      e.target.style.background = '#374151'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.color = '#9CA3AF'
                      e.target.style.background = 'transparent'
                    }}
                  >
                    🏆 Leaderboard
                  </button>
                  
                  <button
                    onClick={() => {
                      navigate('/settings')
                      setUserDropdownOpen(false)
                    }}
                    style={{
                      width: '100%', 
                      padding: '8px 12px', 
                      textAlign: 'left', 
                      fontSize: '14px', 
                      color: '#9CA3AF', 
                      background: 'transparent', 
                      border: 'none', 
                      cursor: 'pointer', 
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.color = '#F9FAFB'
                      e.target.style.background = '#374151'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.color = '#9CA3AF'
                      e.target.style.background = 'transparent'
                    }}
                  >
                    ⚙️ Settings
                  </button>
                  
                  {user?.role === 'ADMIN' && (
                    <button
                      onClick={() => {
                        navigate('/admin')
                        setUserDropdownOpen(false)
                      }}
                      style={{
                        width: '100%', 
                        padding: '8px 12px', 
                        textAlign: 'left', 
                        fontSize: '14px', 
                        color: '#9CA3AF', 
                        background: 'transparent', 
                        border: 'none', 
                        cursor: 'pointer', 
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.color = '#F9FAFB'
                        e.target.style.background = '#374151'
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.color = '#9CA3AF'
                        e.target.style.background = 'transparent'
                      }}
                    >
                      🛡️ Admin Dashboard
                    </button>
                  )}
                  
                  <div style={{ borderTop: '1px solid #374151', margin: '8px 0' }}></div>
                  
                  <button
                    onClick={() => {
                      logout()
                      setUserDropdownOpen(false)
                      navigate('/login')
                    }}
                    style={{
                      width: '100%', 
                      padding: '8px 12px', 
                      textAlign: 'left', 
                      fontSize: '14px', 
                      color: '#EF4444', 
                      background: 'transparent', 
                      border: 'none', 
                      cursor: 'pointer', 
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.color = '#FCA5A5'
                      e.target.style.background = '#374151'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.color = '#EF4444'
                      e.target.style.background = 'transparent'
                    }}
                  >
                    🚪 Sign Out
                  </button>
                </div>
              )}
            </div>

            {/* Post Question Button */}
            <button 
              onClick={() => navigate('/community')}
              style={{
                padding: '8px 16px', 
                background: 'linear-gradient(135deg, #3B82F6, #2563EB)', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px', 
                fontSize: '14px', 
                fontWeight: '600', 
                cursor: 'pointer', 
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
            >
              Post Question
            </button>
          </>
        ) : (
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '8px 16px', 
              background: 'linear-gradient(135deg, #3B82F6, #2563EB)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              fontSize: '14px', 
              fontWeight: '600', 
              cursor: 'pointer', 
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          >
            Sign In
          </button>
        )}
      </div>
    </nav>
  )
}
