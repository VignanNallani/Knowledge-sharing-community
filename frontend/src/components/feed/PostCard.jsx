import { useEffect, useRef, memo, useCallback } from "react";
import { useSocket } from "../../context/SocketProvider";

const PostCard = memo(function PostCard({ post, realtimeActivity = {}, search = "", onLike, onComment, onSave }) {
  const hasEmittedView = useRef(false);
  const { socket } = useSocket();

  const handleLike = useCallback(() => {
    if (onLike) onLike(post.id);
  }, [post.id, onLike]);

  const handleComment = useCallback(() => {
    if (onComment) onComment(post.id);
  }, [post.id, onComment]);

  const handleSave = useCallback(() => {
    if (onSave) onSave(post.id);
  }, [post.id, onSave]);

  useEffect(() => {
    if (!socket || !hasEmittedView.current) {
      socket.emit("post-view", { postId: post.id });
      hasEmittedView.current = true;
    }
  }, [post.id, socket]);

  const activity = realtimeActivity[post.id];

  // Highlight search terms in title
  const highlightText = (text, searchTerm) => {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-900 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <article className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-sm">
                  {post.author.charAt(0)}
                </span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div>
              <div className="font-semibold text-slate-900 text-sm">{post.author}</div>
              <div className="text-xs text-slate-500">{post.role}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>2h ago</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-slate-900 text-base mb-3 leading-tight">
          {highlightText(post.title, search)}
        </h3>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {post.tags.map((tag) => (
            <span key={tag} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200">
              #{tag}
            </span>
          ))}
        </div>

        {/* Content Preview */}
        <p className="text-slate-600 text-sm leading-relaxed mb-4">
          {highlightText(post.content, search)}
        </p>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={handleLike}
              className="flex items-center gap-2 text-slate-600 hover:text-red-500 transition-colors group"
            >
              <div className="p-1.5 rounded-lg group-hover:bg-red-50 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <span className="text-sm font-medium">{post.likes}</span>
            </button>
            <button 
              onClick={handleComment}
              className="flex items-center gap-2 text-slate-600 hover:text-blue-500 transition-colors group"
            >
              <div className="p-1.5 rounded-lg group-hover:bg-blue-50 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <span className="text-sm font-medium">{post.comments}</span>
            </button>
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 text-slate-600 hover:text-green-500 transition-colors group"
            >
              <div className="p-1.5 rounded-lg group-hover:bg-green-50 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </div>
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>{post.views}</span>
          </div>
        </div>

        {/* Real-time Activity Indicator */}
        {activity?.activeUsers > 0 && (
          <div className="flex items-center text-xs text-green-600 gap-1 mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="font-medium">{activity.activeUsers} engineers discussing</span>
            </div>
            <div className="ml-auto">
              <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">Live</span>
            </div>
          </div>
        )}
      </div>
    </article>
  );
});

PostCard.displayName = 'PostCard';

export default PostCard;
