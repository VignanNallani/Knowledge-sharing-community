import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import ImageUpload from '../components/ImageUpload'

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()
  const [profileData, setProfileData] = useState(null)
  const [posts, setPosts] = useState([])
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', bio: '', skills: '' })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('posts')

  // Determine if viewing own profile or someone else's
  const isOwnProfile = !id || (user && parseInt(id) === user.id)
  const profileUserId = isOwnProfile ? user?.id : parseInt(id)

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!profileUserId) return
      
      try {
        setLoading(true)
        const profileRes = await api.get(`/users/${profileUserId}`)
        const profile = profileRes.data.data
        
        setProfileData(profile)
        
        // Fetch user's posts separately
        const postsRes = await api.get(`/posts?authorId=${profileUserId}`)
        setPosts(postsRes.data.data?.posts || [])
        
        // Fetch followers and following counts
        const [followersRes, followingRes] = await Promise.all([
          api.get(`/users/${profileUserId}/followers`),
          api.get(`/users/${profileUserId}/following`)
        ])
        
        setFollowersCount(followersRes.data.data?.count || 0)
        setFollowingCount(followingRes.data.data?.count || 0)
        
        // Check if current user is following this profile (only for other profiles)
        if (!isOwnProfile && user) {
          try {
            const followRes = await api.post(`/users/${profileUserId}/follow`)
            // If we get a response, it means we were following and just unfollowed
            // So we need to follow again to check the state
            await api.post(`/users/${profileUserId}/follow`)
            setIsFollowing(true)
          } catch (error) {
            // If we get an error, it might mean we weren't following
            // Let's check by trying to follow again
            try {
              const followRes = await api.post(`/users/${profileUserId}/follow`)
              setIsFollowing(true)
              // Unfollow to revert the test
              await api.post(`/users/${profileUserId}/follow`)
            } catch (followError) {
              setIsFollowing(false)
            }
          }
        }
        
        // Set edit form with current data
        setEditForm({
          name: profile.name || '',
          bio: profile.bio || '',
          skills: profile.skills || ''
        })
      } catch (err) {
        console.error('Error fetching profile:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProfileData()
  }, [profileUserId, user, isOwnProfile])

  const handleFollow = async () => {
    if (!user || isOwnProfile) return
    
    try {
      const res = await api.post(`/users/${profileUserId}/follow`)
      const { following: nowFollowing } = res.data
      
      setIsFollowing(nowFollowing)
      
      // Update counts optimistically
      if (nowFollowing) {
        setFollowersCount(prev => prev + 1)
      } else {
        setFollowersCount(prev => prev - 1)
      }
    } catch (error) {
      console.error('Failed to follow/unfollow:', error)
    }
  }

  const handleSaveProfile = async () => {
    try {
      const updateData = {
        ...editForm,
        skills: editForm.skills ? editForm.skills.split(',').map(s => s.trim()).filter(s => s) : []
      }
      const response = await api.patch('/users/me', updateData)
      
      // Update local state with new data
      setProfileData(prev => ({
        ...prev,
        ...response.data.data
      }))
      
      setIsEditing(false)
      // Show success message (you could add a toast here)
      alert('Profile updated successfully!')
    } catch (err) {
      console.error('Error updating profile:', err)
      alert('Error updating profile. Please try again.')
    }
  }

  const handleCancelEdit = () => {
    // Reset form to original values
    setEditForm({
      name: profileData?.name || '',
      bio: profileData?.bio || '',
      skills: profileData?.skills || ''
    })
    setIsEditing(false)
  }

  const getInitials = (name) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'

  const timeAgo = (date) => {
    const s = Math.floor((new Date() - new Date(date)) / 1000)
    if (s < 3600) return Math.floor(s / 60) + 'm ago'
    if (s < 86400) return Math.floor(s / 3600) + 'h ago'
    return Math.floor(s / 86400) + 'd ago'
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    })
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0F1E', color: '#F9FAFB', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Loading profile...</div>
      </div>
    )
  }

  if (!profileData) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0F1E', color: '#F9FAFB', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Profile not found</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0F1E', color: '#F9FAFB', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '80px 24px 0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            {profileData.profileImageUrl ? (
              <img 
                src={profileData.profileImageUrl} 
                alt={profileData.name}
                style={{ 
                  width: '100px', 
                  height: '100px', 
                  borderRadius: '50%', 
                  objectFit: 'cover',
                  border: '4px solid #0A0F1E',
                  flexShrink: 0
                }} 
              />
            ) : (
              <div style={{ 
                width: '100px', 
                height: '100px', 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '36px', 
                fontWeight: '800', 
                color: 'white', 
                border: '4px solid #0A0F1E', 
                flexShrink: 0 
              }}>
                {getInitials(profileData.name)}
              </div>
            )}
            {isOwnProfile && (
              <ImageUpload
                onUploadSuccess={(imageUrl) => {
                  setProfileData(prev => ({ ...prev, profileImageUrl: imageUrl }))
                }}
                onUploadError={(error) => {
                  console.error('Profile image upload failed:', error)
                }}
                currentImage={profileData.profileImageUrl}
                buttonText="Change Photo"
                showPreview={false}
                className="profile-image-upload"
              />
            )}
          </div>
          <div style={{ flex: 1, paddingBottom: '8px' }}>
            {isEditing ? (
              <div>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  style={{ 
                    fontSize: '24px', 
                    fontWeight: '800', 
                    fontFamily: 'Plus Jakarta Sans, sans-serif', 
                    margin: '0 0 4px 0',
                    background: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F9FAFB',
                    padding: '8px 12px',
                    width: '300px'
                  }}
                  placeholder="Your name"
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
                  <span style={{ padding: '3px 10px', background: 'rgba(59,130,246,0.15)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>
                    {profileData.role}
                  </span>
                  <span style={{ color: '#9CA3AF', fontSize: '13px' }}>
                    {profileData.email}
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: '24px', fontWeight: '800', fontFamily: 'Plus Jakarta Sans, sans-serif', margin: 0 }}>
                    {profileData.name}
                  </h1>
                  <span style={{ padding: '3px 10px', background: 'rgba(59,130,246,0.15)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>
                    {profileData.role}
                  </span>
                </div>
                <div style={{ color: '#9CA3AF', fontSize: '13px', marginTop: '4px' }}>
                  {profileData.email}
                </div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            {isOwnProfile && !isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                style={{ padding: '8px 16px', background: '#3B82F6', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '13px' }}
              >
                Edit Profile
              </button>
            )}
            {isEditing && (
              <>
                <button 
                  onClick={handleSaveProfile}
                  style={{ padding: '8px 16px', background: '#10B981', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '13px' }}
                >
                  Save
                </button>
                <button 
                  onClick={handleCancelEdit}
                  style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #374151', borderRadius: '8px', color: '#9CA3AF', cursor: 'pointer', fontSize: '13px' }}
                >
                  Cancel
                </button>
              </>
            )}
            {isOwnProfile && (
              <button onClick={() => { logout(); navigate('/login') }} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #374151', borderRadius: '8px', color: '#9CA3AF', cursor: 'pointer', fontSize: '13px' }}>
                Sign Out
              </button>
            )}
          </div>
        </div>

        {/* Bio and Skills Section */}
        <div style={{ marginBottom: '24px' }}>
          {isEditing ? (
            <div style={{ background: '#1A2235', border: '1px solid #1F2A40', borderRadius: '12px', padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#9CA3AF', marginBottom: '8px' }}>
                  Bio (max 200 characters)
                </label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value.slice(0, 200) }))}
                  maxLength={200}
                  style={{ 
                    width: '100%', 
                    minHeight: '80px',
                    background: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F9FAFB',
                    padding: '12px',
                    fontSize: '14px',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                  placeholder="Tell us about yourself..."
                />
                <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                  {editForm.bio.length}/200 characters
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#9CA3AF', marginBottom: '8px' }}>
                  Skills (comma-separated)
                </label>
                <input
                  type="text"
                  value={editForm.skills}
                  onChange={(e) => setEditForm(prev => ({ ...prev, skills: e.target.value }))}
                  style={{ 
                    width: '100%',
                    background: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F9FAFB',
                    padding: '12px',
                    fontSize: '14px',
                    fontFamily: 'inherit'
                  }}
                  placeholder="React, Node.js, TypeScript, Python..."
                />
                <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                  Enter your skills separated by commas
                </div>
              </div>
            </div>
          ) : (
            <div>
              {profileData.bio && (
                <div style={{ background: '#1A2235', border: '1px solid #1F2A40', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#F9FAFB', margin: '0 0 12px 0' }}>About</h3>
                  <p style={{ fontSize: '14px', color: '#D1D5DB', lineHeight: '1.5', margin: 0 }}>
                    {profileData.bio}
                  </p>
                </div>
              )}
              {profileData.skills && (
                <div style={{ background: '#1A2235', border: '1px solid #1F2A40', borderRadius: '12px', padding: '20px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#F9FAFB', margin: '0 0 12px 0' }}>Skills</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {profileData.skills.split(',').map((skill, index) => (
                      <span 
                        key={index}
                        style={{ 
                          padding: '4px 12px', 
                          background: 'rgba(59,130,246,0.1)', 
                          color: '#60A5FA', 
                          border: '1px solid rgba(59,130,246,0.2)', 
                          borderRadius: '16px', 
                          fontSize: '12px', 
                          fontWeight: '500' 
                        }}
                      >
                        {skill.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Posts', value: posts.length },
            { label: 'Followers', value: followersCount },
            { label: 'Following', value: followingCount },
            { label: 'Member Since', value: formatDate(profileData.createdAt) }
          ].map(s => (
            <div key={s.label} style={{ background: '#1A2235', border: '1px solid #1F2A40', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'Plus Jakarta Sans, sans-serif', background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {s.value}
              </div>
              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Follow Button - Only show on other people's profiles */}
        {!isOwnProfile && user && (
          <div style={{ marginBottom: '24px' }}>
            <button
              onClick={handleFollow}
              style={{
                padding: '12px 24px',
                background: isFollowing ? '#10B981' : '#3B82F6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: '#1A2235', border: '1px solid #1F2A40', borderRadius: '10px', padding: '4px', marginBottom: '16px', width: 'fit-content' }}>
          {['posts', 'questions', 'bookmarks'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{ padding: '6px 14px', borderRadius: '7px', border: 'none', background: activeTab === t ? '#3B82F6' : 'transparent', color: activeTab === t ? 'white' : '#9CA3AF', cursor: 'pointer', fontSize: '12px', fontWeight: '600', textTransform: 'capitalize' }}>
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'posts' && (
          <div style={{ background: '#1A2235', border: '1px solid #1F2A40', borderRadius: '16px', padding: '20px' }}>
            {posts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
                <div style={{ fontSize: '48px' }}>💬</div>
                <div style={{ marginTop: '12px' }}>
                  {isOwnProfile ? (
                    <>
                      No posts yet.{' '}
                      <span onClick={() => navigate('/community')} style={{ color: '#3B82F6', cursor: 'pointer' }}>
                        Create your first post →
                      </span>
                    </>
                  ) : (
                    'No posts yet.'
                  )}
                </div>
              </div>
            ) : (
              posts.map(post => (
                <div key={post.id} style={{ background: '#111827', border: '1px solid #1F2A40', borderRadius: '12px', padding: '16px', marginBottom: '10px' }}>
                  <div style={{ fontSize: '15px', fontWeight: '600', fontFamily: 'Plus Jakarta Sans, sans-serif', marginBottom: '6px' }}>
                    {post.title}
                  </div>
                  <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
                    {post.content?.substring(0, 120)}...
                  </div>
                  <div style={{ fontSize: '11px', color: '#6B7280', display: 'flex', gap: '12px' }}>
                    <span>❤️ {post._count?.likes || 0}</span>
                    <span>💬 {post._count?.comments || 0}</span>
                    <span>{timeAgo(post.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        {activeTab !== 'posts' && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#6B7280', background: '#1A2235', border: '1px solid #1F2A40', borderRadius: '16px' }}>
            Coming soon...
          </div>
        )}
      </div>
    </div>
  )
}