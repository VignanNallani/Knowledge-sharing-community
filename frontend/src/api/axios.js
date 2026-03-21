


// import axios from "axios";

// const baseURL =
//   import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

// const api = axios.create({
//   baseURL,
//   withCredentials: true,
// });

// /* =======================
//    REQUEST INTERCEPTOR
//    Attach JWT if available
// ======================= */
// api.interceptors.request.use(
//   (config) => {
//     const token = localStorage.getItem("token");

//     if (token) {
//       config.headers = config.headers || {};
//       config.headers.Authorization = `Bearer ${token}`;
//     }

//     return config;
//   },
//   (error) => Promise.reject(error)
// );

// /* =======================
//    RESPONSE INTERCEPTOR
//    401 handling (PUBLIC FEED SAFE)
// ======================= */
// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     const status = error?.response?.status;
//     const currentPath = window.location.pathname;

//     // 🚫 Do NOT redirect for public feed
//     if (status === 401 && currentPath !== "/feed") {
//       localStorage.removeItem("token");
//       localStorage.removeItem("user");

//       // prevent infinite redirect loops
//       if (!currentPath.includes("signin")) {
//         window.location.href = "/signin";
//       }
//     }

//     return Promise.reject(error);
//   }
// );

// export default api;


import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1";

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

/* =======================
   REQUEST INTERCEPTOR
======================= */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* =======================
   RESPONSE INTERCEPTOR
   Public feed safe
======================= */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401 && localStorage.getItem("token")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      if (!window.location.pathname.includes("signin")) {
        window.location.href = "/signin";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
