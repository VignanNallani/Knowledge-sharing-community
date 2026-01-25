import { useEffect, useState } from 'react'
import api from '../api/axios'

export default function AdminDashboard(){
  const [stats,setStats]=useState({ users:0, posts:0 })
  useEffect(()=>{
    const load = async ()=>{
      try{
        const users = await api.get('/users')
        const posts = await api.get('/api/posts')
        setStats({ users: users.data.length, posts: posts.data.posts?.length ?? posts.data.length })
      }catch(err){ console.error(err) }
    }
    load()
  },[])

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
