import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

export default function AdminLogin(){
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [loading,setLoading]=useState(false)
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try{
      const res = await api.post('/api/auth/login', { email, password })
      const token = res.data.token || res.data.token
      const user = res.data.user || res.data.user
      if(!token) throw new Error('No token')
      if(user?.role !== 'ADMIN'){
        alert('Not an admin account')
        setLoading(false)
        return
      }
      localStorage.setItem('token', token)
      navigate('/admin/dashboard')
    }catch(err){
      alert('Login failed')
      console.error(err)
    }finally{ setLoading(false) }
  }

  return (
    <div className="max-w-md mx-auto mt-12 bg-white p-6 rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Admin Sign In</h2>
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full p-2 border rounded" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="w-full p-2 border rounded" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <div className="flex justify-end">
          <button className="btn btn-primary" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
        </div>
      </form>
    </div>
  )
}
