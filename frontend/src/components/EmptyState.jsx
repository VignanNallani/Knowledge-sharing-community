import React from 'react';
import { Plus, Search, MessageSquare, Users, Calendar } from 'lucide-react';

// Product-Grade Empty State System - Every empty feels intentional
const EmptyState = ({ 
  type = 'default',
  title,
  description,
  actionLabel,
  onAction,
  icon: Icon,
  className = ''
}) => {
  // Predefined empty state types for consistency
  const emptyStates = {
    posts: {
      icon: MessageSquare,
      title: 'No posts yet',
      description: 'Start the conversation by sharing your knowledge or asking a question.',
      actionLabel: 'Create Post'
    },
    search: {
      icon: Search,
      title: 'No results found',
      description: 'Try adjusting your search terms or browse our categories.',
      actionLabel: 'Clear Search'
    },
    connections: {
      icon: Users,
      title: 'No connections yet',
      description: 'Connect with mentors and learners to expand your network.',
      actionLabel: 'Find People'
    },
    sessions: {
      icon: Calendar,
      title: 'No upcoming sessions',
      description: 'Schedule a mentoring session or join an existing one.',
      actionLabel: 'Book Session'
    },
    default: {
      icon: Plus,
      title: 'Nothing here yet',
      description: 'Get started by creating something new or exploring other sections.',
      actionLabel: 'Get Started'
    }
  };

  const config = emptyStates[type] || emptyStates.default;
  const FinalIcon = Icon || config.icon;

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      {/* Icon */}
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <FinalIcon className="w-8 h-8 text-gray-400" />
      </div>

      {/* Content */}
      <div className="max-w-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {title || config.title}
        </h3>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          {description || config.description}
        </p>
        
        {/* Action Button */}
        {onAction && (
          <button
            onClick={onAction}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <FinalIcon className="w-4 h-4" />
            {actionLabel || config.actionLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default EmptyState;
