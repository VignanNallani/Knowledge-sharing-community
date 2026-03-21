import React, { Suspense } from 'react';
import { LoadingSpinner } from '../components/UIStates';

// Lazy loading wrapper with fallback
export const LazyWrapper = ({ children, fallback = null }) => {
  const defaultFallback = (
    <div className="flex items-center justify-center min-h-[200px]">
      <LoadingSpinner size="md" text="Loading..." />
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
};

// Route-level lazy loading
export const LazyRoute = ({ component: Component, ...props }) => {
  return (
    <LazyWrapper>
      <Component {...props} />
    </LazyWrapper>
  );
};

// Modal lazy loading
export const LazyModal = ({ component: Component, isOpen, ...props }) => {
  if (!isOpen) return null;
  
  return (
    <LazyWrapper fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <LoadingSpinner size="md" text="Loading..." />
    </div>}>
      <Component {...props} />
    </LazyWrapper>
  );
};

// Component-level lazy loading
export const LazyComponent = ({ component: Component, fallback, ...props }) => {
  return (
    <LazyWrapper fallback={fallback}>
      <Component {...props} />
    </LazyWrapper>
  );
};
