


// import React, { useState } from "react";
// import api from "../api/axios";
// import { Link, useNavigate } from "react-router-dom";

// export default function SignUp() {
//   const [name, setName] = useState("");
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [error, setError] = useState("");
//   const navigate = useNavigate();

//   const submit = async (e) => {
//     e.preventDefault();
//     setError("");

//     try {
//       const res = await api.post("/api/auth/register", {
//         name,
//         email,
//         password,
//       });

//       localStorage.setItem("token", res.data.token);
//       localStorage.setItem("user", JSON.stringify(res.data.user));

//       navigate("/");
//     } catch (err) {
//       setError(err?.response?.data?.message || "Registration failed");
//     }
//   };

//   return (
//     <div className="min-h-screen premium-bg grid grid-cols-1 lg:grid-cols-2">
      
//       {/* LEFT — BRAND */}
//       <div className="hidden lg:flex flex-col justify-center px-16">
//         <h1 className="text-5xl font-extrabold leading-tight">
//           Join Knowledge Sharing
//         </h1>
//         <p className="mt-2 text-lg text-accent tracking-wide">
//           Tech Community
//         </p>

//         <p className="mt-6 text-gray-300 max-w-md leading-relaxed">
//           Create your space in a community built for serious learners,
//           builders, and mentors.
//         </p>

//         <div className="mt-10 glass-panel max-w-sm">
//           <p className="text-sm">
//             ✨ Personalized feed  
//             <br />🧠 Learn from experts  
//             <br />📈 Grow faster, together
//           </p>
//         </div>
//       </div>

//       {/* RIGHT — FORM */}
//       <div className="flex items-center justify-center px-6">
//         <div className="w-full max-w-md glass-panel">
          
//           <h2 className="text-2xl font-bold mb-1">
//             Create your account
//           </h2>
//           <p className="text-sm muted mb-6">
//             It takes less than a minute
//           </p>

//           {error && (
//             <div className="mb-4 text-sm text-red-400">
//               {error}
//             </div>
//           )}

//           <form onSubmit={submit} className="space-y-4">
//             <input
//               placeholder="Full name"
//               className="glass-input"
//               value={name}
//               onChange={(e) => setName(e.target.value)}
//               required
//             />

//             <input
//               type="email"
//               placeholder="Email address"
//               className="glass-input"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               required
//             />

//             <input
//               type="password"
//               placeholder="Password"
//               className="glass-input"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               required
//             />

//             <button className="btn btn-primary w-full">
//               Create account
//             </button>
//           </form>

//           <p className="mt-6 text-sm text-center muted">
//             Already have an account?{" "}
//             <Link to="/signin" className="text-accent hover:underline">
//               Sign in
//             </Link>
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }



import React, { useState } from "react";
import api from "../api/axios";
import { Link, useNavigate } from "react-router-dom";

export default function SignUp() {
  const [name, setName] = useState("");
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
      const res = await api.post("/api/auth/register", {
        name,
        email,
        password,
      });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      navigate("/");
    } catch (err) {
      setError(err?.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen premium-bg flex items-center justify-center">
      <div className="w-full max-w-md glass-panel">
        <h2 className="text-2xl font-bold mb-1">Create your account</h2>
        <p className="text-sm muted mb-6">It takes less than a minute</p>

        {error && <div className="mb-4 text-sm text-red-400">{error}</div>}

        <form onSubmit={submit} className="space-y-4">
          <input
            placeholder="Full name"
            className="glass-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
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
            {loading ? "Please wait..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-sm text-center muted">
          Already have an account?{" "}
          <Link to="/signin" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
