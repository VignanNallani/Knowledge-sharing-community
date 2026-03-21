import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import apiService from "../services/api"
import PostImageUpload from "./PostImageUpload"

export default function CreatePost() {
  const [content, setContent] = useState("")
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("general")
  const [isExpanded, setIsExpanded] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [selectedImage, setSelectedImage] = useState(null)
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'frontend', label: 'Frontend' },
    { value: 'backend', label: 'Backend' },
    { value: 'devops', label: 'DevOps' },
    { value: 'mobile', label: 'Mobile' },
    { value: 'ai-ml', label: 'AI/ML' },
    { value: 'career', label: 'Career' }
  ]

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getAvatarColor = (name) => {
    const colors = ['from-blue-400 to-blue-600', 'from-green-400 to-green-600', 'from-purple-400 to-purple-600']
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }

  const handlePost = async () => {
    if (!isAuthenticated) {
      setError("Please log in to create a post")
      return
    }

    if (!content.trim() && !title.trim()) {
      setError("Please add a title or content")
      return
    }

    try {
      setIsSubmitting(true)
      setError("")
      
      // Create FormData to handle image upload
      const formData = new FormData()
      formData.append('title', title.trim() || 'Untitled Discussion')
      formData.append('content', content.trim())
      if (selectedImage) {
        formData.append('image', selectedImage)
      }

      const response = await apiService.post('/posts', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      
      if (response.data) {
        // Clear form
        setContent("")
        setTitle("")
        setCategory("general")
        setSelectedImage(null)
        setIsExpanded(false)
        
        // Show success toast
        setShowToast(true)
        setTimeout(() => setShowToast(false), 3000)
        
        // Notify parent component to refresh posts
        window.dispatchEvent(new CustomEvent('newPostCreated', { 
          detail: response.data 
        }))
      }
    } catch (err) {
      console.error('Error creating post:', err)
      if (err.response?.status === 401) {
        setError("Please log in to create a post")
      } else if (err.response?.status === 429) {
        setError("Too many posts. Please wait a moment.")
      } else if (err.response?.status >= 500) {
        setError("Server error. Please try again later.")
      } else {
        setError("Failed to create post. Please try again.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFocus = () => {
    setIsExpanded(true)
  }

  return (
    <>
      {!isAuthenticated ? (
        <div className="card text-center py-8">
          <div className="text-4xl mb-4">🔐</div>
          <h3 className="font-heading font-semibold text-[var(--text-primary)] text-lg mb-2">Login Required</h3>
          <p className="text-[var(--text-secondary)] mb-4">Please log in to start discussions and share your knowledge</p>
          <button 
            onClick={() => navigate('/login')}
            className="btn-gradient px-6 py-2"
          >
            Log In to Post
          </button>
        </div>
      ) : (
        <div className="card hover-lift">
          {/* User Avatar and Name Row */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(user?.name || 'User')} flex items-center justify-center text-white font-semibold`}>
              {getInitials(user?.name || 'User')}
            </div>
            <div className="text-[var(--text-primary)] font-medium">{user?.name || 'User'}</div>
            {user?.role && (
              <span className={`px-2 py-0.5 text-xs text-white rounded-full ${
                user.role === 'ADMIN' ? 'bg-purple-500' : 
                user.role === 'MENTOR' ? 'bg-blue-500' : 'bg-gray-500'
              }`}>
                {user.role}
              </span>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

        {/* Title Input (shown when expanded) */}
        {isExpanded && (
          <input
            type="text"
            placeholder="Discussion title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-xl p-4 text-[var(--text-primary)] placeholder-[var(--text-muted)] mb-3 focus:outline-none focus:border-[var(--accent-blue)] focus:ring-2 focus:ring-[rgba(59,130,246,0.1)] transition-all duration-200"
            maxLength={100}
          />
        )}

        {/* Image Upload (shown when expanded) */}
        {isExpanded && (
          <div className="mb-3">
            <PostImageUpload
              onImageUpload={setSelectedImage}
              currentImage={selectedImage ? URL.createObjectURL(selectedImage) : null}
            />
          </div>
        )}

        {/* Main Textarea */}
        <div className="relative mb-3">
          <textarea
            placeholder={isExpanded ? "Share your thoughts, ask questions, start a discussion..." : "What's on your mind? Start a discussion..."}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={handleFocus}
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-xl p-4 text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none focus:outline-none focus:border-[var(--accent-blue)] focus:ring-2 focus:ring-[rgba(59,130,246,0.1)] transition-all duration-200"
            style={{ minHeight: isExpanded ? '120px' : '100px' }}
            maxLength={500}
          />
          
          {content && (
            <div className="absolute bottom-2 right-2 text-xs text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2 py-1 rounded border border-[var(--border-light)]">
              {content.length}/500
            </div>
          )}
        </div>

        {/* Toolbar Row (shown when expanded) */}
        {isExpanded && (
          <div className="flex items-center justify-between mb-3">
            {/* Left: Icon buttons */}
            <div className="flex items-center gap-2">
              <button className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent-blue)] hover:bg-[rgba(59,130,246,0.1)] transition-all duration-200" title="Attach file">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"></path>
                </svg>
              </button>
              
              <button className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent-blue)] hover:bg-[rgba(59,130,246,0.1)] transition-all duration-200" title="Add image">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
              </button>
              
              <button className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent-blue)] hover:bg-[rgba(59,130,246,0.1)] transition-all duration-200" title="Add code">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="16 18 22 12 16 6"></polyline>
                  <polyline points="8 6 2 12 8 18"></polyline>
                </svg>
              </button>
              
              <button className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent-blue)] hover:bg-[rgba(59,130,246,0.1)] transition-all duration-200" title="Add tag">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"></path>
                  <line x1="7" y1="7" x2="7.01" y2="7"></line>
                </svg>
              </button>
            </div>

            {/* Right: Category dropdown and Post button */}
            <div className="flex items-center gap-3">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-[var(--bg-secondary)] border border-[var(--border-light)] text-[var(--text-primary)] px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:border-[var(--accent-blue)] transition-all duration-200"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              
              <button 
                className="btn-gradient px-6 py-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                onClick={handlePost}
                disabled={!content.trim()}
              >
                Post
              </button>
            </div>
          </div>
        )}

        {/* Collapse button (shown when expanded but not focused) */}
        {isExpanded && (
          <button
            className="text-[var(--text-muted)] text-sm hover:text-[var(--text-primary)] transition-colors duration-200"
            onClick={() => setIsExpanded(false)}
          >
            Cancel
          </button>
        )}

          {/* Success Toast */}
          {showToast && (
            <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-slide-in z-50">
              Post published successfully! 🎉
            </div>
          )}
        </div>
      )}
    </>
  )
}
