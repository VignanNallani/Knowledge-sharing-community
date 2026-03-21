import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'

export default function LandingPage() {
  const [stats, setStats] = useState({
    users: 10000,
    mentors: 500,
    posts: 50000,
    loading: true
  })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, postsRes] = await Promise.all([
          api.get('/users'),
          api.get('/posts')
        ])
        
        const usersData = usersRes.data.data?.users || usersRes.data.data || usersRes.data.users || usersRes.data || []
        const postsData = postsRes.data.data?.posts || postsRes.data.data || postsRes.data.posts || postsRes.data || []
        
        const users = Array.isArray(usersData) ? usersData : []
        const posts = Array.isArray(postsData) ? postsData : []
        const mentors = users.filter(u => u.role === 'MENTOR').length
        
        setStats({
          users: users.length,
          mentors: mentors,
          posts: posts.length,
          loading: false
        })
      } catch (err) {
        console.error('Stats fetch error:', err)
        setStats(prev => ({ ...prev, loading: false }))
      }
    }
    
    fetchStats()
  }, [])
  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-[rgba(59,130,246,0.15)] to-transparent rounded-full blur-[120px] -translate-y-[200px] -translate-x-[200px]"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-[rgba(139,92,246,0.1)] to-transparent rounded-full blur-[120px] translate-y-[200px] translate-x-[200px]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px_1px_40px,transparent)]"></div>
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-[100] h-16 bg-[rgba(10,15,30,0.8)] backdrop-blur-[20px] border-b border-[rgba(255,255,255,0.1)] flex items-center justify-between px-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] rounded-lg flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
            </svg>
          </div>
          <h1 className="font-bold text-xl text-white">DevMentor</h1>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          <Link 
            to="/login" 
            className="px-4 py-2 text-[#9CA3AF] hover:text-white border border-[rgba(255,255,255,0.2)] rounded-lg hover:border-[#3B82F6] transition-all duration-200"
          >
            Log In
          </Link>
          <Link 
            to="/signup" 
            className="px-6 py-2 bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white rounded-full font-semibold hover:scale-105 hover:brightness-110 transition-all duration-200"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.3)] rounded-full mb-8">
            <span className="text-[#60A5FA] text-sm font-medium">
              🚀 Join {stats.loading ? '...' : stats.users.toLocaleString()}+ developers
            </span>
          </div>

          {/* Main Heading */}
          <h1 className="font-bold leading-tight mb-6">
            <span className="block text-7xl text-white">Where Developers Learn,</span>
            <span className="block text-7xl bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] bg-clip-text text-transparent">Share & Grow Together</span>
          </h1>

          {/* Subtext */}
          <p className="text-xl text-[#9CA3AF] mb-8 max-w-[560px] mx-auto leading-relaxed">
            Join {stats.loading ? '...' : stats.users.toLocaleString()}+ developers in building the future of tech collaboration.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
            <Link 
              to="/signup" 
              className="px-8 py-4 bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white rounded-full font-semibold text-lg hover:scale-105 hover:brightness-110 transition-all duration-200"
            >
              Join Free
            </Link>
            <Link 
              to="/community" 
              className="px-8 py-4 text-[#9CA3AF] border border-[rgba(255,255,255,0.2)] rounded-full font-semibold text-lg hover:text-white hover:border-[#3B82F6] transition-all duration-200"
            >
              Explore Community
            </Link>
          </div>

          {/* Note */}
          <p className="text-[#9CA3AF] text-sm">
            No credit card required · Free forever plan
          </p>
        </div>
      </section>

      {/* Social Proof Stats */}
      <section className="border-t border-b border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-white mb-2">
                {stats.loading ? '...' : stats.users.toLocaleString()}+
              </div>
              <div className="text-[#9CA3AF]">Developers</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-2">
                {stats.loading ? '...' : stats.mentors.toLocaleString()}+
              </div>
              <div className="text-[#9CA3AF]">Mentors</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-2">
                {stats.loading ? '...' : stats.posts.toLocaleString()}+
              </div>
              <div className="text-[#9CA3AF]">Posts</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-2">120+</div>
              <div className="text-[#9CA3AF]">Countries</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Everything you need to grow</h2>
            <p className="text-xl text-[#9CA3AF] max-w-2xl mx-auto">
              One platform for learning, mentorship, and community
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="bg-[#1A2235] border border-[rgba(255,255,255,0.1)] rounded-2xl p-8 hover:translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 bg-[#3B82F6] rounded-full flex items-center justify-center mb-6">
                <span className="text-2xl">💬</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Community Discussions</h3>
              <p className="text-[#9CA3AF] leading-relaxed">
                Ask questions, share insights, and learn from thousands of developers across all skill levels.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-[#1A2235] border border-[#3B82F6] rounded-2xl p-8 hover:translate-y-1 transition-all duration-300 relative">
              <div className="absolute top-4 right-4 px-3 py-1 bg-[#3B82F6] text-white text-xs rounded-full">
                Most Popular
              </div>
              <div className="w-12 h-12 bg-[#3B82F6] rounded-full flex items-center justify-center mb-6">
                <span className="text-2xl">🎓</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Expert Mentorship</h3>
              <p className="text-[#9CA3AF] leading-relaxed">
                Connect 1-on-1 with senior engineers from top tech companies. Get personalized guidance.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-[#1A2235] border border-[rgba(255,255,255,0.1)] rounded-2xl p-8 hover:translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 bg-[#3B82F6] rounded-full flex items-center justify-center mb-6">
                <span className="text-2xl">🏆</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Gamified Learning</h3>
              <p className="text-[#9CA3AF] leading-relaxed">
                Earn points, unlock badges, and climb leaderboards as you learn and contribute.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Mentors */}
      <section className="py-20 px-6 bg-[rgba(255,255,255,0.02)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Learn from the best</h2>
            <p className="text-xl text-[#9CA3AF]">Handpicked mentors from top companies</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Mentor 1 */}
            <div className="bg-[#1A2235] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 hover:border-[#3B82F6] transition-all duration-300">
              <div className="flex items-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] rounded-full flex items-center justify-center text-white font-bold text-lg">
                  AK
                </div>
                <div className="ml-4">
                  <h4 className="font-semibold text-white">Alex Kumar</h4>
                  <p className="text-[#9CA3AF] text-sm">Senior Engineer at Google</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="px-2 py-1 bg-[rgba(59,130,246,0.2)] text-[#60A5FA] text-xs rounded-full">React</span>
                <span className="px-2 py-1 bg-[rgba(59,130,246,0.2)] text-[#60A5FA] text-xs rounded-full">Node.js</span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <span className="text-yellow-400 text-sm">★★★★★</span>
                  <span className="text-[#9CA3AF] text-sm ml-1">(127 reviews)</span>
                </div>
              </div>
              <button className="w-full py-2 border border-[#3B82F6] text-[#3B82F6] rounded-lg hover:bg-[#3B82F6] hover:text-white transition-all duration-200">
                Book Session
              </button>
            </div>

            {/* Mentor 2 */}
            <div className="bg-[#1A2235] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 hover:border-[#3B82F6] transition-all duration-300">
              <div className="flex items-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] rounded-full flex items-center justify-center text-white font-bold text-lg">
                  SC
                </div>
                <div className="ml-4">
                  <h4 className="font-semibold text-white">Sarah Chen</h4>
                  <p className="text-[#9CA3AF] text-sm">Staff Engineer at Meta</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="px-2 py-1 bg-[rgba(59,130,246,0.2)] text-[#60A5FA] text-xs rounded-full">System Design</span>
                <span className="px-2 py-1 bg-[rgba(59,130,246,0.2)] text-[#60A5FA] text-xs rounded-full">Python</span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <span className="text-yellow-400 text-sm">★★★★★</span>
                  <span className="text-[#9CA3AF] text-sm ml-1">(89 reviews)</span>
                </div>
              </div>
              <button className="w-full py-2 border border-[#3B82F6] text-[#3B82F6] rounded-lg hover:bg-[#3B82F6] hover:text-white transition-all duration-200">
                Book Session
              </button>
            </div>

            {/* Mentor 3 */}
            <div className="bg-[#1A2235] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 hover:border-[#3B82F6] transition-all duration-300">
              <div className="flex items-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] rounded-full flex items-center justify-center text-white font-bold text-lg">
                  MJ
                </div>
                <div className="ml-4">
                  <h4 className="font-semibold text-white">Marcus Johnson</h4>
                  <p className="text-[#9CA3AF] text-sm">Tech Lead at Stripe</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="px-2 py-1 bg-[rgba(59,130,246,0.2)] text-[#60A5FA] text-xs rounded-full">Backend</span>
                <span className="px-2 py-1 bg-[rgba(59,130,246,0.2)] text-[#60A5FA] text-xs rounded-full">AWS</span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <span className="text-yellow-400 text-sm">★★★★★</span>
                  <span className="text-[#9CA3AF] text-sm ml-1">(203 reviews)</span>
                </div>
              </div>
              <button className="w-full py-2 border border-[#3B82F6] text-[#3B82F6] rounded-lg hover:bg-[#3B82F6] hover:text-white transition-all duration-200">
                Book Session
              </button>
            </div>

            {/* Mentor 4 */}
            <div className="bg-[#1A2235] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 hover:border-[#3B82F6] transition-all duration-300">
              <div className="flex items-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] rounded-full flex items-center justify-center text-white font-bold text-lg">
                  PP
                </div>
                <div className="ml-4">
                  <h4 className="font-semibold text-white">Priya Patel</h4>
                  <p className="text-[#9CA3AF] text-sm">ML Engineer at OpenAI</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="px-2 py-1 bg-[rgba(59,130,246,0.2)] text-[#60A5FA] text-xs rounded-full">AI/ML</span>
                <span className="px-2 py-1 bg-[rgba(59,130,246,0.2)] text-[#60A5FA] text-xs rounded-full">Python</span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <span className="text-yellow-400 text-sm">★★★★★</span>
                  <span className="text-[#9CA3AF] text-sm ml-1">(67 reviews)</span>
                </div>
              </div>
              <button className="w-full py-2 border border-[#3B82F6] text-[#3B82F6] rounded-lg hover:bg-[#3B82F6] hover:text-white transition-all duration-200">
                Book Session
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-[rgba(59,130,246,0.2)] to-[rgba(139,92,246,0.2)] border border-[rgba(59,130,246,0.3)] rounded-3xl p-12 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to accelerate your career?</h2>
            <p className="text-xl text-[#9CA3AF] mb-8">Join thousands of developers already growing with DevMentor</p>
            <Link 
              to="/signup" 
              className="inline-block px-8 py-4 bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white rounded-full font-semibold text-lg hover:scale-105 hover:brightness-110 transition-all duration-200"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[rgba(255,255,255,0.1)] py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <div className="w-8 h-8 bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
              </svg>
            </div>
            <h3 className="font-bold text-white">DevMentor</h3>
          </div>
          
          <div className="flex gap-8 text-[#9CA3AF] text-sm mb-4 md:mb-0">
            <Link to="#" className="hover:text-white transition-colors">About</Link>
            <Link to="#" className="hover:text-white transition-colors">Blog</Link>
            <Link to="#" className="hover:text-white transition-colors">Careers</Link>
            <Link to="#" className="hover:text-white transition-colors">Privacy</Link>
          </div>
          
          <div className="text-[#9CA3AF] text-sm">
            © 2026 DevMentor
          </div>
        </div>
      </footer>
    </div>
  )
}
