import React from 'react';
import RealTimeComments from '../components/RealTimeComments';
import RealTimeNotifications from '../components/RealTimeNotifications';
import './PostDetailPage.css';

const PostDetailPage = ({ postId }) => {
  // Mock initial comments data - in real app, this would come from API
  const initialComments = [
    {
      id: 1,
      content: "This is a great post! Thanks for sharing.",
      author: {
        id: 2,
        name: "John Doe",
        profileImageUrl: null
      },
      createdAt: "2026-03-19T10:00:00Z",
      likeCount: 5,
      isLiked: false,
      replies: [
        {
          id: 2,
          content: "I agree! Very helpful information.",
          author: {
            id: 3,
            name: "Jane Smith",
            profileImageUrl: null
          },
          createdAt: "2026-03-19T10:30:00Z",
          likeCount: 2,
          isLiked: true
        }
      ]
    }
  ];

  return (
    <div className="post-detail-page">
      {/* Header with notifications */}
      <header className="page-header">
        <h1>Knowledge Sharing Community</h1>
        <RealTimeNotifications />
      </header>

      {/* Main content */}
      <main className="main-content">
        {/* Post content would go here */}
        <article className="post-content">
          <h2>Sample Post Title</h2>
          <p>This is where the actual post content would be displayed...</p>
        </article>

        {/* Real-time comments section */}
        <section className="comments-section">
          <RealTimeComments 
            postId={postId} 
            initialComments={initialComments} 
          />
        </section>
      </main>

      {/* Sidebar or additional content */}
      <aside className="sidebar">
        <div className="sidebar-section">
          <h3>Real-time Features</h3>
          <div className="feature-list">
            <div className="feature-item">
              <span className="feature-icon">💬</span>
              <span>Live Comments</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">❤️</span>
              <span>Instant Likes</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🔔</span>
              <span>Real-time Notifications</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">👥</span>
              <span>Live User Count</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default PostDetailPage;
