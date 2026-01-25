


// import { Routes, Route } from "react-router-dom";

// /* ─── Layouts ─── */
// import AppLayout from "./layouts/AppLayout";
// import AuthLayout from "./layouts/AuthLayout";

// /* ─── Pages ─── */
// import Feed from "./pages/Feed";
// import SignIn from "./pages/SignIn";
// import SignUp from "./pages/SignUp";
// import Profile from "./pages/Profile";
// import CreatePost from "./pages/CreatePost";
// import PostDetail from "./pages/PostDetail";
// import Mentors from "./pages/Mentors";
// import MyMentorships from "./pages/MyMentorships";
// import AdminLogin from "./pages/AdminLogin";
// import AdminDashboard from "./pages/AdminDashboard";

// /* ─── Guards & Global ─── */
// import ProtectedRoute from "./components/ProtectedRoute";
// import NotificationHandler from "./components/NotificationHandler";

// export default function App() {
//   return (
//     <>
//       {/* Global notifications */}
//       <NotificationHandler />

//       <Routes>
//         {/* ───────────────── AUTH ───────────────── */}
//         <Route element={<AuthLayout />}>
//           <Route path="/signin" element={<SignIn />} />
//           <Route path="/signup" element={<SignUp />} />
//           <Route path="/admin" element={<AdminLogin />} />
//         </Route>

//         {/* ───────────────── USER / MENTOR APP ───────────────── */}
//         <Route
//           element={
//             <ProtectedRoute>
//               <AppLayout />
//             </ProtectedRoute>
//           }
//         >
//           <Route path="/" element={<Feed />} />
//           <Route path="/posts/:id" element={<PostDetail />} />
//           <Route path="/posts/new" element={<CreatePost />} />
//           <Route path="/profile/:id" element={<Profile />} />
//           <Route path="/mentorship" element={<Mentors />} />
//           <Route path="/my-mentorships" element={<MyMentorships />} />
//         </Route>

//         {/* ───────────────── ADMIN ───────────────── */}
//         <Route
//           element={
//             <ProtectedRoute role="ADMIN">
//               <AppLayout />
//             </ProtectedRoute>
//           }
//         >
//           <Route path="/admin/dashboard" element={<AdminDashboard />} />
//         </Route>
//       </Routes>
//     </>
//   );
// }


import { Routes, Route, Navigate } from "react-router-dom";

/* ─── Layouts ─── */
import AppLayout from "./layouts/AppLayout";
import AuthLayout from "./layouts/AuthLayout";

/* ─── Pages ─── */
import Feed from "./pages/Feed";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Profile from "./pages/Profile";
import CreatePost from "./pages/CreatePost";
import PostDetail from "./pages/PostDetail";
import Mentors from "./pages/Mentors";
import MyMentorships from "./pages/MyMentorships";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";

/* ─── Guards & Global ─── */
import ProtectedRoute from "./components/ProtectedRoute";
import NotificationHandler from "./components/NotificationHandler";

export default function App() {
  return (
    <>
      <NotificationHandler />

      <Routes>
        {/* ───────── AUTH ───────── */}
        <Route element={<AuthLayout />}>
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/admin" element={<AdminLogin />} />
        </Route>

        {/* Redirect root */}
        <Route path="/" element={<Navigate to="/community" />} />

        {/* ───────── USER / MENTOR APP ───────── */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/community" element={<Feed />} />
          <Route path="/posts/:id" element={<PostDetail />} />
          <Route path="/create" element={<CreatePost />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/mentorship" element={<Mentors />} />
          <Route path="/my-mentorships" element={<MyMentorships />} />
        </Route>

        {/* ───────── ADMIN ───────── */}
        <Route
          element={
            <ProtectedRoute role="ADMIN">
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Route>
      </Routes>
    </>
  );
}
