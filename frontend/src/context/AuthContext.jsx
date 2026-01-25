


// import { createContext, useContext, useEffect, useState } from "react";
// import { getUser, getToken, logout } from "../utils/auth";

// const AuthContext = createContext(null);

// export function AuthProvider({ children }) {
//   const [user, setUser] = useState(null);
//   const [role, setRole] = useState("user");
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const token = getToken();
//     const storedUser = getUser();

//     if (token && storedUser) {
//       setUser(storedUser);
//       setRole(storedUser.role || "user");
//     } else {
//       setUser(null);
//       setRole(null);
//     }

//     setLoading(false);
//   }, []);

//   const signOut = () => {
//     logout();
//     setUser(null);
//     setRole(null);
//   };

//   return (
//     <AuthContext.Provider
//       value={{
//         user,
//         role,
//         isAuthenticated: !!user,
//         signOut
//       }}
//     >
//       {!loading && children}
//     </AuthContext.Provider>
//   );
// }

// export function useAuth() {
//   return useContext(AuthContext);
// }



import { createContext, useContext, useEffect, useState } from "react";
import { getUser, getToken, logout } from "../utils/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const syncAuth = () => {
    const token = getToken();
    const storedUser = getUser();

    if (token && storedUser) {
      setUser(storedUser);
      setRole(storedUser.role || "USER");
    } else {
      setUser(null);
      setRole(null);
    }
  };

  useEffect(() => {
    syncAuth();
    setLoading(false);

    // 🔥 THIS WAS MISSING
    window.addEventListener("auth-changed", syncAuth);
    return () => window.removeEventListener("auth-changed", syncAuth);
  }, []);

  const signOut = () => {
    logout();
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated: !!user,
        signOut,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
