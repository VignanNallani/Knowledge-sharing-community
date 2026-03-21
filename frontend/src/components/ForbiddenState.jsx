import React from 'react';
import { Shield, Lock, ArrowLeft, Home, Crown, Key } from 'lucide-react';

// Premium 403/Forbidden State - Never shows raw permission errors
const ForbiddenState = ({ 
  type = 'default',
  title,
  description,
  actionLabel,
  onAction,
  secondaryAction,
  secondaryLabel,
  icon: Icon,
  className = ''
}) => {
  // Predefined forbidden states for different scenarios
  const forbiddenStates = {
    admin: {
      icon: Crown,
      title: 'Admin access required',
      description: 'This area is restricted to administrators only. Contact your system admin if you need access.',
      actionLabel: 'Go to Dashboard',
      secondaryLabel: 'Contact Admin'
    },
    moderator: {
      icon: Shield,
      title: 'Moderator permissions needed',
      description: 'You need moderator privileges to access this content. Apply for moderator status to help manage the community.',
      actionLabel: 'Back to Community',
      secondaryLabel: 'Apply for Moderator'
    },
    mentor: {
      icon: Key,
      title: 'Mentor access required',
      description: 'This feature is available to verified mentors only. Complete your mentor profile to unlock advanced tools.',
      actionLabel: 'Become a Mentor',
      secondaryLabel: 'View Guidelines'
    },
    private: {
      icon: Lock,
      title: 'Private content',
      description: 'This content is private or you don\'t have permission to view it. Request access from the content owner.',
      actionLabel: 'Go Back',
      secondaryLabel: 'Request Access'
    },
    default: {
      icon: Shield,
      title: 'Access denied',
      description: 'You don\'t have permission to access this resource. If you believe this is an error, please contact support.',
      actionLabel: 'Go Home',
      secondaryLabel: 'Contact Support'
    }
  };

  const config = forbiddenStates[type] || forbiddenStates.default;
  const FinalIcon = Icon || config.icon;

  return (
    <div className={`min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4 ${className}`}>
      <div className="max-w-md w-full text-center">
        {/* Icon with Animation */}
        <div className="relative mb-8">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto relative">
            <FinalIcon className="w-12 h-12 text-red-600 relative z-10" />
            {/* Subtle pulse effect */}
            <div className="absolute inset-0 bg-red-200 rounded-full animate-ping opacity-20"></div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-red-100">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            {title || config.title}
          </h1>
          
          <p className="text-gray-600 mb-8 leading-relaxed">
            {description || config.description}
          </p>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={onAction || (() => window.history.back())}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            >
              <ArrowLeft className="w-4 h-4" />
              {actionLabel || config.actionLabel}
            </button>

            {secondaryAction && (
              <button
                onClick={secondaryAction}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium"
              >
                <Home className="w-4 h-4" />
                {secondaryLabel || config.secondaryLabel}
              </button>
            )}
          </div>

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Need help? Contact{' '}
              <a href="mailto:support@knowledge-sharing.com" className="text-red-600 hover:underline">
                support@knowledge-sharing.com
              </a>
            </p>
          </div>
        </div>

        {/* Status Code Badge */}
        <div className="mt-6 inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
          <Shield className="w-3 h-3" />
          403 Forbidden
        </div>
      </div>
    </div>
  );
};

export default ForbiddenState;
