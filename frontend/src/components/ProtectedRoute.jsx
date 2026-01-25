

// import { Navigate } from "react-router-dom";
// import { useAuth } from "../context/AuthContext";

// export default function ProtectedRoute({ children, role }) {
//   const { isAuthenticated, role: userRole } = useAuth();

//   if (!isAuthenticated) {
//     return <Navigate to="/signin" replace />;
//   }

//   if (role && userRole !== role) {
//     return <Navigate to="/" replace />;
//   }

//   return children;
// }


import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth();

  // ⏳ WAIT for auth to resolve
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  // 🔐 Not logged in
  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  // 🛡️ Role-based access
  if (role && user.role !== role) {
    return <Navigate to="/community" replace />;
  }

  // ✅ IMPORTANT: render layout outlet
  return children ? children : <Outlet />;
}
