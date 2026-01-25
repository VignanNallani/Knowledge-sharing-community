

// /**
//  * Get logged-in user object
//  */
// export const getUser = () => {
//   try {
//     const user = localStorage.getItem("user");
//     return user ? JSON.parse(user) : null;
//   } catch (err) {
//     console.error("Failed to parse user from localStorage", err);
//     return null;
//   }
// };

// /**
//  * Get JWT token
//  */
// export const getToken = () => {
//   return localStorage.getItem("token");
// };

// /**
//  * Check authentication status
//  */
// export const isAuthenticated = () => {
//   return Boolean(getToken());
// };

// /**
//  * Save auth data after login
//  * (Call this after successful login API response)
//  */
// export const setAuth = ({ token, user }) => {
//   if (!token || !user) return;

//   localStorage.setItem("token", token);
//   localStorage.setItem("user", JSON.stringify(user));
// };

// /**
//  * Logout user safely
//  */
// export const logout = () => {
//   localStorage.removeItem("token");
//   localStorage.removeItem("user");

//   // Optional: clear any cached app state later
//   // localStorage.removeItem("theme");
//   // localStorage.removeItem("draftPost");

//   window.location.replace("/signin");
// };



/**
 * Get logged-in user object
 */
export const getUser = () => {
  try {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  } catch (err) {
    console.error("Failed to parse user from localStorage", err);
    return null;
  }
};

/**
 * Get JWT token
 */
export const getToken = () => {
  return localStorage.getItem("token");
};

/**
 * Check authentication status
 */
export const isAuthenticated = () => {
  return Boolean(getToken());
};

/**
 * Save auth data after login
 */
export const setAuth = ({ token, user }) => {
  if (!token || !user) return;

  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
};

/**
 * Logout user (SAFE + SPA FRIENDLY)
 */
export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  // 🔥 notify app to re-render auth state
  window.dispatchEvent(new Event("auth-changed"));
};
