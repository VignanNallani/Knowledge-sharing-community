import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

export default function PostDetailPage() {
  const { id } = useParams()
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchPost = async () => {
      try {
        console.log('Fetching post id:', id)
        const res = await api.get(`/posts/${id}`)
        console.log('Post response:', res.data)
        const postData = res.data.message
        console.log('SET POST TO:', postData);
        setPost(postData)
        // Handle both old and new response structures for comments
        const initialComments = postData.comments || res.data.data?.comments || res.data.message?.comments || [];
        setComments(initialComments)
      } catch (err) {
        console.error('Failed to fetch post:', err)
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchPost()
  }, [id])

  useEffect(() => {
    console.log('POST DATA:', post);
    console.log('AUTHOR:', post?.author);
  }, [post]);

  const handleComment = async () => {
    console.log('SUBMITTING COMMENT:', newComment, 'TOKEN:', token);
    
    if (!newComment.trim()) return
    if (!token) {
      console.error('NO TOKEN - User not logged in');
      return;
    }
    
    setSubmitting(true)
    try {
      // Use correct endpoint: /posts/${id}/comments (plural)
      await api.post(`/posts/${id}/comments`, { content: newComment });
      
      console.log('COMMENT POSTED SUCCESSFULLY');
      
      // Re-fetch comments after posting
      const commentsRes = await api.get(`/posts/${id}/comments`);
      const fetchedComments = commentsRes.data.data?.comments || commentsRes.data.message?.comments || commentsRes.data || [];
      setComments(fetchedComments);
      
      // Clear input
      setNewComment('');
      
      // Update post comment count
      setPost(prev => prev ? {
        ...prev,
        commentsCount: (prev.commentsCount || 0) + 1
      } : prev);
      
    } catch (err) {
      console.error('COMMENT ERROR:', err.response?.data || err.message);
    } finally {
      setSubmitting(false)
    }
  }

  const timeAgo = (date) => {
    if (!date) return ''
    const s = Math.floor((new Date() - new Date(date)) / 1000)
    if (s < 60) return 'just now'
    if (s < 3600) return Math.floor(s / 60) + 'm ago'
    if (s < 86400) return Math.floor(s / 3600) + 'h ago'
    return Math.floor(s / 86400) + 'd ago'
  }

  const getInitials = (name) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0A0F1E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
      Loading...
    </div>
  )

  if (!post) return (
    <div style={{ minHeight: '100vh', background: '#0A0F1E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
      Post not found. <span onClick={() => navigate('/community')} style={{ color: '#3B82F6', cursor: 'pointer', marginLeft: 8 }}>Go back</span>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0A0F1E', color: '#F9FAFB', fontFamily: 'DM Sans, sans-serif', padding: '24px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>

        {/* Back button */}
        <div onClick={() => navigate('/community')} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9CA3AF', cursor: 'pointer', marginBottom: '24px', width: 'fit-content' }}>
          ← Back to Community
        </div>

        {/* Post Card */}
        <div style={{ background: '#1A2235', border: '1px solid #1F2A40', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
          {/* Author */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: 'white', fontSize: '16px' }}>
              {getInitials(post.author?.name)}
            </div>
            <div>
              <div style={{ fontWeight: '600', fontSize: '15px' }}>{post.author?.name || 'Unknown'}</div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>{timeAgo(post.createdAt)}</div>
            </div>
            <span style={{ marginLeft: 'auto', padding: '3px 10px', background: 'rgba(59,130,246,0.15)', color: '#60A5FA', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>
              {post.author?.role}
            </span>
          </div>

          {/* Title */}
          <h1 style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'Plus Jakarta Sans, sans-serif', marginBottom: '12px', lineHeight: '1.3' }}>
            {post.title}
          </h1>

          {/* Content */}
          <p style={{ fontSize: '15px', color: '#D1D5DB', lineHeight: '1.7', marginBottom: '20px', whiteSpace: 'pre-wrap' }}>
            {post.content}
          </p>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '16px', color: '#9CA3AF', fontSize: '14px' }}>
            <span>❤️ {post._count?.likes || post.likesCount || 0} likes</span>
            <span>💬 {comments.length} comments</span>
          </div>
        </div>

        {/* Comments Section */}
        <div style={{ background: '#1A2235', border: '1px solid #1F2A40', borderRadius: '16px', padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>
            💬 {comments.length} Comments
          </h2>

          {/* Comment Input */}
          <div style={{ marginBottom: '24px' }}>
            <textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              rows={3}
              style={{ width: '100%', background: '#111827', border: '1px solid #1F2A40', borderRadius: '10px', padding: '12px', color: 'white', fontSize: '14px', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
            />
            <button
              onClick={handleComment}
              disabled={submitting || !newComment.trim()}
              style={{ marginTop: '8px', padding: '10px 24px', background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: '600', cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? 'Posting...' : 'Post Comment'}
            </button>
          </div>

          {/* Comments List */}
          {comments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#6B7280' }}>
              No comments yet. Be the first to comment!
            </div>
          ) : (
            comments.map((comment, i) => (
              <div key={comment.id || i} style={{ display: 'flex', gap: '12px', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #1F2A40' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: 'white', fontSize: '13px', flexShrink: 0 }}>
                  {getInitials(comment.author?.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '600', fontSize: '14px' }}>{comment.author?.name || 'User'}</span>
                    <span style={{ fontSize: '11px', color: '#6B7280' }}>{timeAgo(comment.createdAt)}</span>
                  </div>
                  <p style={{ fontSize: '14px', color: '#D1D5DB', lineHeight: '1.5', margin: 0 }}>{comment.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  )
}
