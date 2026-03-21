import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function PostCard({ 
  post,
  timeAgo,
  getInitials,
  getAvatarColor,
  onLike
}) {
  const [isLiking, setIsLiking] = useState(false)
  const navigate = useNavigate()

  // Extract data from post object
  const {
    id,
    author,
    title,
    content = '',
    imageUrl,
    createdAt,
    likedByMe = false, // Changed from 'liked' to 'likedByMe'
    tags = []
  } = post

  // Get likes count from likesCount property, fallback to _count.likes for backward compatibility
  const likesCount = post.likesCount || post._count?.likes || 0
  const commentsCount = post.commentsCount || post._count?.comments || 0

  const handleLike = async () => {
    if (isLiking || !onLike) return
    setIsLiking(true)
    try {
      await onLike(id)
    } finally {
      setIsLiking(false)
    }
  }

  const handleComment = (e) => {
    e.stopPropagation()
    console.log(`Comment on post ${id}`)
    // TODO: Navigate to post detail
  }

  const handleShare = (e) => {
    e.stopPropagation()
    navigator.clipboard.writeText(window.location.href + `/post/${id}`)
    // TODO: Show toast notification
  }

  const handleCardClick = () => {
    navigate(`/posts/${id}`)
  }

  const handleAuthorClick = (e) => {
    e.stopPropagation()
    // TODO: Navigate to author profile
  }

  const handleCommentClick = (e) => {
    e.stopPropagation()
    navigate(`/posts/${id}`)
  }

  const getRoleBadge = (role) => {
    if (role === 'ADMIN') {
      return { label: 'Admin', color: 'bg-purple-500' }
    } else if (role === 'MENTOR') {
      return { label: 'Mentor', color: 'bg-blue-500' }
    } else {
      return { label: 'Member', color: 'bg-gray-500' }
    }
  }

  const roleBadge = getRoleBadge(author?.role)

  return (
    <div 
      className="card hover-lift cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Header: Avatar + User Info + Timestamp */}
      <div className="flex items-start gap-3 mb-4">
        <div className="relative">
          <div 
            className={`w-11 h-11 rounded-full bg-gradient-to-br ${getAvatarColor(author?.name)} flex items-center justify-center text-white font-semibold text-sm cursor-pointer hover:ring-2 hover:ring-[var(--accent-blue)] transition-all duration-200`}
            onClick={handleAuthorClick}
          >
            {getInitials(author?.name)}
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 
              className="font-heading font-semibold text-[var(--text-primary)] text-sm cursor-pointer hover:text-[var(--accent-blue)] transition-colors"
              onClick={handleAuthorClick}
            >
              {author?.name || 'Anonymous'}
            </h4>
            <span className={`px-2 py-0.5 text-xs text-white rounded-full ${roleBadge.color}`}>
              {roleBadge.label}
            </span>
          </div>
          <p className="text-[var(--text-muted)] text-xs">
            {timeAgo ? timeAgo(createdAt) : new Date(createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Title (if exists) */}
      {title && (
        <h3 
          className="font-heading font-semibold text-[var(--text-primary)] text-lg mb-2 leading-tight cursor-pointer hover:text-[var(--accent-blue)] transition-colors"
          onClick={handleCardClick}
        >
          {title}
        </h3>
      )}

      {/* Content */}
      {content && (
        <div className="font-body text-[var(--text-secondary)] text-sm leading-relaxed mb-3">
          {content.length > 200 ? `${content.substring(0, 200)}...` : content}
        </div>
      )}

      {/* Image */}
      {imageUrl && (
        <div className="mb-3">
          <img 
            src={imageUrl} 
            alt="Post image"
            className="w-full rounded-lg border border-[var(--border-light)] cursor-pointer hover:opacity-90 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              // Open image in new tab or show modal
              window.open(imageUrl, '_blank')
            }}
            style={{ maxHeight: '400px', objectFit: 'cover' }}
          />
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.slice(0, 3).map((tag, index) => (
            <span 
              key={index}
              className="px-2 py-0.5 bg-[rgba(59,130,246,0.1)] text-[var(--accent-blue)] border border-[rgba(59,130,246,0.2)] rounded-full text-xs font-medium"
            >
              #{tag}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="text-[var(--text-muted)] text-xs">
              +{tags.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--border-light)]">
        <div className="flex items-center gap-4">
          {/* Like Button */}
          <button 
            onClick={handleLike}
            disabled={isLiking}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              likedByMe 
                ? 'text-[var(--accent-blue)] bg-[rgba(59,130,246,0.1)]' 
                : 'text-[var(--text-muted)] hover:text-[var(--accent-blue)] hover:bg-[rgba(59,130,246,0.05)]'
            }`}
          >
            <svg 
              className={`w-4 h-4 ${isLiking ? 'animate-pulse' : ''}`} 
              fill={likedByMe ? 'currentColor' : 'none'} 
              stroke="currentColor" 
              strokeWidth="2" 
              viewBox="0 0 24 24"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <span>{likesCount}</span>
          </button>

          {/* Comment Button */}
          <button 
            onClick={handleComment}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:text-[var(--accent-blue)] hover:bg-[rgba(59,130,246,0.05)] transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
            <span>{commentsCount}</span>
          </button>

          {/* Share Button */}
          <button 
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:text-[var(--accent-blue)] hover:bg-[rgba(59,130,246,0.05)] transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
            <span>Share</span>
          </button>
        </div>
      </div>
    </div>
  )
}
                      
