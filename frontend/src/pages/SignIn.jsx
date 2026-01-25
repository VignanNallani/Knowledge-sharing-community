


// import React, { useState } from "react";
// import api from "../api/axios";
// import { Link, useNavigate } from "react-router-dom";

// export default function SignIn() {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);
//   const navigate = useNavigate();

//   const submit = async (e) => {
//     e.preventDefault();
//     setError("");
//     setLoading(true);

//     try {
//       const res = await api.post("/api/auth/login", { email, password });
//       localStorage.setItem("token", res.data.token);
//       localStorage.setItem("user", JSON.stringify(res.data.user));
//       navigate("/");
//     } catch (err) {
//       setError(err?.response?.data?.message || "Login failed");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen premium-bg flex items-center justify-center">
//       <div className="w-full max-w-md glass-panel">
//         <h2 className="text-2xl font-bold mb-1">Welcome back</h2>
//         <p className="text-sm muted mb-6">Sign in to continue</p>

//         {error && <div className="mb-4 text-sm text-red-400">{error}</div>}

//         <form onSubmit={submit} className="space-y-4">
//           <input
//             type="email"
//             placeholder="Email"
//             className="glass-input"
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//             required
//           />
//           <input
//             type="password"
//             placeholder="Password"
//             className="glass-input"
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             required
//           />
//           <button
//             className="btn btn-primary w-full"
//             disabled={loading}
//           >
//             {loading ? "Please wait..." : "Sign in"}
//           </button>
//         </form>

//         <p className="mt-6 text-sm text-center muted">
//           Don’t have an account?{" "}
//           <Link to="/signup" className="text-accent hover:underline">
//             Create one
//           </Link>
//         </p>
//       </div>
//     </div>
//   );
// }


import React, { useState } from "react";
import api from "../api/axios";
import { Link, useNavigate } from "react-router-dom";
import { setAuth } from "../utils/auth";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/api/auth/login", {
        email,
        password,
      });

      // ✅ Save auth data centrally
      setAuth({
        token: res.data.token,
        user: res.data.user,
      });

      // ✅ Notify whole app that auth changed
      window.dispatchEvent(new Event("auth-changed"));

      // ✅ Navigate to dashboard
      navigate("/", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen premium-bg flex items-center justify-center">
      <div className="w-full max-w-md glass-panel">
        <h2 className="text-2xl font-bold mb-1">Welcome back</h2>
        <p className="text-sm muted mb-6">Sign in to continue</p>

        {error && <div className="mb-4 text-sm text-red-500">{error}</div>}

        <form onSubmit={submit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="glass-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="glass-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            className="btn btn-primary w-full"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-sm text-center muted">
          Don’t have an account?{" "}
          <Link to="/signup" className="text-accent hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
