// import React from "react";
// import { Link } from "react-router-dom";

// export default function MentorCard({ mentor, onBook }) {
//   return (
//     <div className="card group hover:scale-[1.02] transition-all duration-300 flex flex-col h-full relative overflow-hidden text-center md:text-left">
//       {/* Top accent line */}
//       <div className="absolute top-0 left-0 w-full h-1 bg-[var(--accent-gradient)] opacity-0 group-hover:opacity-100 transition-opacity"></div>

//       <div className="flex flex-col md:flex-row items-center gap-5 mb-4">
//         {/* Avatar */}
//         <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-[2px] shadow-lg">
//           <div className="w-full h-full rounded-2xl bg-white overflow-hidden">
//             <img
//               src={`https://ui-avatars.com/api/?name=${mentor.name}&background=random`}
//               alt={mentor.name}
//               className="w-full h-full object-cover"
//             />
//           </div>
//         </div>

//         <div className="flex-1">
//           <h3 className="font-bold text-lg text-[var(--text-primary)]">{mentor.name}</h3>
//           <p className="text-[var(--text-secondary)] text-sm font-medium">{mentor.title || "Senior Mentor"}</p>
//           <div className="mt-2 flex flex-wrap gap-2 justify-center md:justify-start">
//             {/* Mock Skills chips */}
//             {["React", "Design", "Career"].map(tag => (
//               <span key={tag} className="text-xs px-2 py-1 rounded bg-[var(--surface-hover)] text-[var(--text-secondary)] border border-[var(--border-soft)]">
//                 {tag}
//               </span>
//             ))}
//           </div>
//         </div>
//       </div>

//       <p className="text-[var(--text-secondary)] text-sm line-clamp-2 mb-6 flex-1">
//         {mentor.bio || "Experienced mentor ready to help you grow your career and technical skills."}
//       </p>

//       <div className="flex items-center gap-3 pt-4 border-t border-[var(--border-soft)]">
//         <Link
//           to={`/profile/${mentor.id}`}
//           className="flex-1 btn btn-ghost text-sm justify-center border border-[var(--border-soft)] hover:bg-[var(--surface-hover)]"
//         >
//           View Profile
//         </Link>
//         <button
//           onClick={() => onBook?.(mentor)}
//           className="flex-1 btn btn-primary text-sm shadow-lg shadow-indigo-500/20"
//         >
//           Book Session
//         </button>
//       </div>
//     </div>
//   );
// }



import React from "react";
import { Link } from "react-router-dom";

export default function MentorCard({ mentor, onBook }) {
  // 🚨 HARD SAFETY CHECK (prevents blank screen)
  if (!mentor) return null;

  const name = mentor.name || "Unknown Mentor";
  const title = mentor.title || "Senior Mentor";
  const bio =
    mentor.bio ||
    "Experienced mentor ready to help you grow your career and technical skills.";

  return (
    <div className="card group hover:scale-[1.02] transition-all duration-300 flex flex-col h-full relative overflow-hidden text-center md:text-left">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-[var(--accent-gradient)] opacity-0 group-hover:opacity-100 transition-opacity"></div>

      <div className="flex flex-col md:flex-row items-center gap-5 mb-4">
        {/* Avatar */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-[2px] shadow-lg">
          <div className="w-full h-full rounded-2xl bg-white overflow-hidden">
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                name
              )}&background=random`}
              alt={name}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="flex-1">
          <h3 className="font-bold text-lg text-[var(--text-primary)]">
            {name}
          </h3>
          <p className="text-[var(--text-secondary)] text-sm font-medium">
            {title}
          </p>

          <div className="mt-2 flex flex-wrap gap-2 justify-center md:justify-start">
            {["React", "Design", "Career"].map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-1 rounded bg-[var(--surface-hover)] text-[var(--text-secondary)] border border-[var(--border-soft)]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="text-[var(--text-secondary)] text-sm line-clamp-2 mb-6 flex-1">
        {bio}
      </p>

      <div className="flex items-center gap-3 pt-4 border-t border-[var(--border-soft)]">
        <Link
          to={`/profile/${mentor.id}`}
          className="flex-1 btn btn-ghost text-sm justify-center border border-[var(--border-soft)] hover:bg-[var(--surface-hover)]"
        >
          View Profile
        </Link>

        <button
          onClick={() => onBook?.(mentor)}
          className="flex-1 btn btn-primary text-sm shadow-lg shadow-indigo-500/20"
        >
          Book Session
        </button>
      </div>
    </div>
  );
}
