import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  const getPoints = (userId, allPosts) => {
    const userPosts = allPosts.filter(p => p.authorId === userId)
    return userPosts.length * 100 + 500
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, postsRes] = await Promise.all([
          api.get('/users'),
          api.get('/posts')
        ])
        
        const usersData = usersRes.data.data?.users || usersRes.data.data || usersRes.data.users || usersRes.data || []
        const postsData = postsRes.data.data?.posts || postsRes.data.data || postsRes.data.posts || postsRes.data || []
        
        const usersArr = Array.isArray(usersData) ? usersData : []
        const postsArr = Array.isArray(postsData) ? postsData : []
        
        const ranked = usersArr.map((u) => ({
          ...u,
          points: getPoints(u.id, postsArr),
          postsCount: postsArr.filter(p => p.authorId === u.id).length
        })).sort((a, b) => b.points - a.points)
        
        setUsers(ranked)
        setPosts(postsArr)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const getInitials = (name) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'

  const getRankBg = (i) => {
    if (i === 0) return 'linear-gradient(135deg,#F59E0B,#FCD34D)'
    if (i === 1) return 'linear-gradient(135deg,#9CA3AF,#D1D5DB)'
    if (i === 2) return 'linear-gradient(135deg,#B45309,#D97706)'
    return '#1F2A40'
  }

  const getRankColor = (i) => {
    if (i === 0) return '#7C2D12'
    if (i === 1) return '#374151'
    if (i === 2) return 'white'
    return '#9CA3AF'
  }

  const top3 = users.slice(0, 3)
  const rest = users.slice(3)

  return (
    <div style={{ minHeight: '100vh', background: '#0A0F1E', color: '#F9FAFB', padding: '32px 24px', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', fontFamily: 'Plus Jakarta Sans, sans-serif', marginBottom: '8px' }}>
          🏆 Leaderboard
        </h1>
        <p style={{ color: '#9CA3AF', marginBottom: '32px' }}>
          Top contributors this week
        </p>

        {top3.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: '12px', marginBottom: '32px' }}>
            {[top3[1], top3[0], top3[2]].map((u, i) => {
              if (!u) return <div key={i} />
              const realRank = i === 0 ? 2 : i === 1 ? 1 : 3
              return (
                <div key={u.id} style={{ background: '#1A2235', border: `1px solid ${realRank === 1 ? '#F59E0B' : '#1F2A40'}`, borderRadius: '16px', padding: '20px', textAlign: 'center', marginTop: realRank === 1 ? '0' : '24px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '800', color: 'white', margin: '0 auto 10px' }}>
                    {getInitials(u.name)}
                  </div>
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: getRankBg(realRank - 1), color: getRankColor(realRank - 1), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800', margin: '0 auto 8px' }}>
                    {realRank}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '700', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    {u.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#60A5FA', fontWeight: '700', marginTop: '4px' }}>
                    {u.points} pts
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div style={{ background: '#1A2235', border: '1px solid #1F2A40', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 100px 100px', padding: '10px 16px', borderBottom: '1px solid #1F2A40', fontSize: '11px', color: '#6B7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
            <span>Rank</span>
            <span>User</span>
            <span style={{ textAlign: 'center' }}>Posts</span>
            <span style={{ textAlign: 'right' }}>Points</span>
          </div>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>Loading...</div>
          ) : (
            users.map((u, i) => (
              <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 100px 100px', padding: '12px 16px', borderBottom: '1px solid #111827', background: u.email === user?.email ? 'rgba(59,130,246,0.08)' : 'transparent', alignItems: 'center' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: getRankBg(i), color: getRankColor(i), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800' }}>
                  {i + 1}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: 'white', flexShrink: 0 }}>
                    {getInitials(u.name)}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {u.name}
                      {u.email === user?.email && (
                        <span style={{ fontSize: '9px', background: 'rgba(59,130,246,0.2)', color: '#60A5FA', padding: '1px 6px', borderRadius: '10px' }}>You</span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>{u.role}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'center', fontSize: '13px', color: '#9CA3AF' }}>{u.postsCount}</div>
                <div style={{ textAlign: 'right', fontSize: '13px', fontWeight: '700', color: '#60A5FA' }}>{u.points}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}