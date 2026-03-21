import { useState, useEffect } from 'react'
import api from '../lib/api'

export default function MentorsPage() {
  const [mentors, setMentors] = useState([])
  const [loading, setLoading] = useState(true)
  const [followingMap, setFollowingMap] = useState({})

  useEffect(() => {
    fetchMentors()
  }, [])

  const fetchMentors = async () => {
    try {
      const res = await api.get('/users?limit=52')
      const allUsers = res.data.data?.users || res.data.data || []
      const mentorUsers = allUsers.filter(u => u.role === 'MENTOR')
      setMentors(mentorUsers)
    } catch (error) {
      console.error('Failed to fetch mentors:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async (mentorId) => {
    try {
      const res = await api.post(`/users/${mentorId}/follow`);
      console.log('FOLLOW RESPONSE:', res.data);
      
      // Try all possible response paths
      const isFollowing = 
        res.data?.data?.following ??
        res.data?.following ??
        res.data?.data?.isFollowing ??
        true; // default to true if unclear
      
      setFollowingMap(prev => ({ ...prev, [mentorId]: isFollowing }));
    } catch (err) {
      console.error('Follow error:', err.response?.data);
    }
  };

  const getInitials = (name) => 
    name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'M'



const getSkills = (id) => {
  const allSkills = [
    ['React', 'Node.js', 'TypeScript'],
    ['Python', 'Django', 'AWS'],
    ['Vue.js', 'Docker', 'MongoDB'],
    ['Angular', 'Java', 'Spring Boot'],
    ['React Native', 'iOS', 'Android'],
    ['DevOps', 'Kubernetes', 'CI/CD']
  ]
  return allSkills[id % allSkills.length]
}

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0F1E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#F9FAFB' }}>Loading mentors...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0F1E', color: '#F9FAFB', fontFamily: 'DM Sans, sans-serif', padding: '32px 24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', fontFamily: 'Plus Jakarta Sans, sans-serif', marginBottom: '8px' }}>
          🎓 Find Mentors
        </h1>
        <p style={{ color: '#9CA3AF', marginBottom: '32px' }}>
          Connect with experienced mentors to accelerate your learning
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          {mentors.map(mentor => (
            <div key={mentor.id} style={{
              background: '#1A2235',
              border: '1px solid #1F2A40',
              borderRadius: '16px',
              padding: '24px',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{
                  width: '48px', height: '48px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', fontWeight: '700', color: 'white'
                }}>
                  {getInitials(mentor.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ fontSize: '16px', fontWeight: '600', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                      {mentor.name}
                    </div>
                    <span style={{ fontSize: '14px' }}>✅</span>
                  </div>
                  <div style={{
                    padding: '2px 8px', background: 'rgba(59,130,246,0.15)',
                    color: '#60A5FA', border: '1px solid rgba(59,130,246,0.3)',
                    borderRadius: '12px', fontSize: '10px', fontWeight: '600', display: 'inline-block', marginTop: '4px'
                  }}>
                    {mentor.role}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '6px' }}>Skills:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {getSkills(mentor.id).map((skill, i) => (
                    <span key={i} style={{
                      padding: '4px 8px', background: '#111827',
                      color: '#9CA3AF', borderRadius: '6px', fontSize: '11px'
                    }}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => handleFollow(mentor.id)}
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    background: followingMap[mentor.id] ? '#10b981' : '#6366f1',
                    color: '#fff',
                    border: 'none', 
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 13
                  }}
                >
                  {followingMap[mentor.id] ? '✓ Following' : 'Follow'}
                </button>
                
                <button 
                  style={{ 
                    flex: 2,
                    padding: '10px', 
                    width: '100%', 
                    background: '#374151', 
                    color: '#9ca3af', 
                    border: '1px solid #4b5563', 
                    borderRadius: 8,
                    cursor: 'not-allowed', 
                    fontSize: 14 
                  }}
                >
                  Book Session (Coming Soon)
                </button>
              </div>
            </div>
          ))}
        </div>

        {mentors.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#6B7280' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎓</div>
            <div>No mentors available at the moment</div>
          </div>
        )}
      </div>

      </div>
  )
}
