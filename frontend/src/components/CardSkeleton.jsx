import React from 'react';

// Card Skeleton - Consistent loading for cards across the app
const CardSkeleton = ({ 
  lines = 3, 
  showAvatar = true, 
  showActions = false,
  className = ''
}) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      {/* Header with Avatar */}
      {showAvatar && (
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse mb-2"></div>
            <div className="h-3 bg-gray-100 rounded w-24 animate-pulse"></div>
          </div>
        </div>
      )}

      {/* Content Lines */}
      <div className="space-y-2 mb-4">
        {Array.from({ length: lines }).map((_, i) => {
          const widthClass = i === 0 ? 'w-full' : i === lines - 1 ? 'w-4/6' : 'w-5/6';
          return (
            <div 
              key={i} 
              className={`h-4 bg-gray-200 rounded ${widthClass} animate-pulse`}
            ></div>
          );
        })}
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div className="flex items-center space-x-4 pt-4 border-t border-gray-100">
          <div className="h-8 bg-gray-100 rounded w-16 animate-pulse"></div>
          <div className="h-8 bg-gray-100 rounded w-16 animate-pulse"></div>
          <div className="h-8 bg-gray-100 rounded w-16 animate-pulse"></div>
        </div>
      )}
    </div>
  );
};

export default CardSkeleton;
