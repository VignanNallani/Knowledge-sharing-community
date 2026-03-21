import React, { useEffect } from 'react';
import { useRequestCancellation } from '../lib/requestManager';

// Hook to prevent state updates on unmounted components
export const useCleanupOnUnmount = (cleanupFn) => {
  useEffect(() => {
    return cleanupFn;
  }, [cleanupFn]);
};

// Hook to cancel requests on unmount
export const useCancelRequestsOnUnmount = () => {
  const { cancelAllRequests } = useRequestCancellation();
  
  useCleanupOnUnmount(() => {
    cancelAllRequests();
  });
};

// Hook to track component mount state
export const useIsMounted = () => {
  const [isMounted, setIsMounted] = React.useState(true);
  
  React.useEffect(() => {
    return () => {
      setIsMounted(false);
    };
  }, []);
  
  return isMounted;
};

// Safe state update that checks if component is mounted
export const useSafeState = (initialValue) => {
  const [state, setState] = React.useState(initialValue);
  const isMounted = useIsMounted();
  
  const safeSetState = React.useCallback((newValue) => {
    if (isMounted) {
      setState(newValue);
    }
  }, [isMounted]);
  
  return [state, safeSetState];
};

// Hook for safe async operations
export const useSafeAsync = () => {
  const isMounted = useIsMounted();
  
  const safeAsync = React.useCallback(async (asyncFn) => {
    try {
      const result = await asyncFn();
      return isMounted ? result : null;
    } catch (error) {
      if (isMounted) {
        throw error;
      }
      return null;
    }
  }, [isMounted]);
  
  return safeAsync;
};
