import { useEffect, useState } from 'react'
import api from '../api/axios'

export default function AdminDashboard(){
  const [stats, setStats] = useState({ users: 0, posts: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Fetch users count
        const usersResponse = await api.get('/api/v1/users')
        const usersCount = usersResponse.data?.count || usersResponse.data?.length || 0
        
        // Fetch posts count  
        const postsResponse = await api.get('/api/v1/posts')
        const postsCount = postsResponse.data?.count || postsResponse.data?.posts?.length || postsResponse.data?.length || 0
        
        setStats({ users: usersCount, posts: postsCount })
      } catch (err) {
        setError('Failed to load dashboard stats')
        console.error('Dashboard error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Loading state
  if (loading) {
    return (
      <div className="bg-white p-6 rounded">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4 w-48"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white p-6 rounded">
        <h1 className="text-xl font-semibold mb-4">Admin Dashboard</h1>
        <div className="text-center py-8">
          <div className="text-red-500 mb-2">⚠️</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded">
      <h1 className="text-xl font-semibold mb-4">Admin Dashboard</h1>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 card">
          <div className="text-sm text-gray-500">Total users</div>
          <div className="text-2xl font-bold">{stats.users}</div>
        </div>
        <div className="p-4 card">
          <div className="text-sm text-gray-500">Total posts</div>
          <div className="text-2xl font-bold">{stats.posts}</div>
        </div>
      </div>
    </div>
  )
}
