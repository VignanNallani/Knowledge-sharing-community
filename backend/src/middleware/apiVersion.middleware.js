/**
 * API Version Enforcement Middleware
 * Ensures all API routes are under /api/v1/ prefix
 */

export const apiVersionMiddleware = (req, res, next) => {
  // Check if request is to API endpoints
  if (req.path.startsWith('/api/')) {
    // Check if version is specified
    const versionMatch = req.path.match(/^\/api\/v(\d+)\//);
    
    if (!versionMatch) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'API_VERSION_REQUIRED',
          message: 'API version is required. Use /api/v1/ prefix for all API endpoints.'
        }
      });
    }
    
    const requestedVersion = parseInt(versionMatch[1]);
    const supportedVersion = 1;
    
    if (requestedVersion !== supportedVersion) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'API_VERSION_UNSUPPORTED',
          message: `API version v${requestedVersion} is not supported. Please use v${supportedVersion}.`
        }
      });
    }
    
    // Add version info to request for logging
    req.apiVersion = requestedVersion;
  }
  
  next();
};

/**
 * Version prefix middleware
 * Automatically redirects unversioned API routes to versioned ones
 */
export const versionRedirectMiddleware = (req, res, next) => {
  // Redirect common unversioned routes to v1
  const unversionedRoutes = [
    '/auth',
    '/posts',
    '/users',
    '/comments',
    '/likes',
    '/follow',
    '/feed',
    '/health'
  ];
  
  if (unversionedRoutes.includes(req.path)) {
    const versionedPath = `/api/v1${req.path}`;
    return res.redirect(301, versionedPath);
  }
  
  next();
};

export default {
  apiVersionMiddleware,
  versionRedirectMiddleware
};
