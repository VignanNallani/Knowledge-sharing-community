import React, { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import './RealTimeComments.css';

const RealTimeComments = ({ postId, initialComments = [] }) => {
  const [comments, setComments] = useState(initialComments);
  const [newComment, setNewComment] = useState('');
  const { isConnected, joinPost, leavePost } = useSocket();

  useEffect(() => {
    // Join post room when component mounts
    if (postId) {
      joinPost(postId);
    }

    // Set up socket event listeners
    const handleNewComment = (data) => {
      if (data.postId === postId) {
        setComments(prev => [data.comment, ...prev]);
      }
    };

    const handleCommentDeleted = (data) => {
      if (data.postId === postId) {
        setComments(prev => prev.filter(comment => comment.id !== data.commentId));
      }
    };

    const handleCommentLiked = (data) => {
      if (data.postId === postId) {
        setComments(prev => prev.map(comment => 
          comment.id === data.commentId 
            ? { ...comment, likeCount: data.likeCount, isLiked: true }
            : comment
        ));
      }
    };

    const handleCommentUnliked = (data) => {
      if (data.postId === postId) {
        setComments(prev => prev.map(comment => 
          comment.id === data.commentId 
            ? { ...comment, likeCount: data.likeCount, isLiked: false }
            : comment
        ));
      }
    };

    // Register socket listeners
    socketService.on('new_comment', handleNewComment);
    socketService.on('comment_deleted', handleCommentDeleted);
    socketService.on('comment_liked', handleCommentLiked);
    socketService.on('comment_unliked', handleCommentUnliked);

    return () => {
      // Leave post room and cleanup listeners
      leavePost(postId);
      socketService.off('new_comment', handleNewComment);
      socketService.off('comment_deleted', handleCommentDeleted);
      socketService.off('comment_liked', handleCommentLiked);
      socketService.off('comment_unliked', handleCommentUnliked);
    };
  }, [postId, joinPost, leavePost]);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const response = await fetch('/api/v1/comments/post/' + postId, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ content: newComment })
      });

      if (response.ok) {
        setNewComment('');
        // Comment will be added via socket event
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  const handleLikeComment = async (commentId) => {
    try {
      await fetch(`/api/v1/comments/like/${commentId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      // Like will be updated via socket event
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await fetch(`/api/v1/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      // Deletion will be handled via socket event
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const commentTime = new Date(timestamp);
    const diffMs = now - commentTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'just now';
  };

  return (
    <div className="real-time-comments">
      <div className="connection-status">
        <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></span>
        {isConnected ? 'Connected' : 'Connecting...'}
      </div>

      <div className="comments-section">
        <h3>Comments ({comments.length})</h3>
        
        {/* Comment form */}
        <form onSubmit={handleSubmitComment} className="comment-form">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            rows="3"
            required
          />
          <button type="submit" disabled={!newComment.trim()}>
            Post Comment
          </button>
        </form>

        {/* Comments list */}
        <div className="comments-list">
          {comments.map(comment => (
            <div key={comment.id} className="comment-item">
              <div className="comment-header">
                <img 
                  src={comment.author.profileImageUrl || '/default-avatar.png'} 
                  alt={comment.author.name}
                  className="author-avatar"
                />
                <div className="author-info">
                  <span className="author-name">{comment.author.name}</span>
                  <span className="comment-time">{formatTimeAgo(comment.createdAt)}</span>
                </div>
                {comment.authorId === parseInt(localStorage.getItem('userId')) && (
                  <button 
                    onClick={() => handleDeleteComment(comment.id)}
                    className="delete-btn"
                  >
                    Delete
                  </button>
                )}
              </div>
              
              <div className="comment-content">
                {comment.content}
              </div>
              
              <div className="comment-actions">
                <button 
                  onClick={() => handleLikeComment(comment.id)}
                  className={`like-btn ${comment.isLiked ? 'liked' : ''}`}
                >
                  ❤️ {comment.likeCount || 0}
                </button>
              </div>

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="replies-section">
                  {comment.replies.map(reply => (
                    <div key={reply.id} className="reply-item">
                      <div className="comment-header">
                        <img 
                          src={reply.author.profileImageUrl || '/default-avatar.png'} 
                          alt={reply.author.name}
                          className="author-avatar small"
                        />
                        <div className="author-info">
                          <span className="author-name">{reply.author.name}</span>
                          <span className="comment-time">{formatTimeAgo(reply.createdAt)}</span>
                        </div>
                      </div>
                      <div className="comment-content">
                        {reply.content}
                      </div>
                      <div className="comment-actions">
                        <button className="like-btn">
                          ❤️ {reply.likeCount || 0}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RealTimeComments;
