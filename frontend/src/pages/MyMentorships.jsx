

// import React, { useEffect, useState } from "react";
// import api from "../api/axios";
// import AppLayout from "../layouts/AppLayout";


// export default function MyMentorships() {
//   const [mentorships, setMentorships] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     api
//       .get("/api/mentorships/my-mentorships")
//       .then((res) => {
//         setMentorships(res.data?.mentorships || []);
//       })
//       .finally(() => setLoading(false));
//   }, []);

//   return (
//     <AppLayout>
//       <div className="space-y-6">
//         <h2 className="text-2xl font-semibold">My Mentorships</h2>

//         {loading && <div>Loading…</div>}

//         {!loading && mentorships.length === 0 && (
//           <div className="card p-8 text-center">
//             <div className="text-3xl mb-2">🤝</div>
//             <h3 className="font-semibold">No mentorships yet</h3>
//             <p className="text-sm text-[var(--text-secondary)] mt-1">
//               Browse mentors and book your first session.
//             </p>
//           </div>
//         )}

//         <div className="space-y-3">
//           {mentorships.map((m) => (
//             <div key={m.id} className="p-4 card">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <div className="font-medium">
//                     With: {m.mentor?.name || m.mentee?.name}
//                   </div>
//                   <div className="text-sm muted">Topic: {m.topic}</div>
//                 </div>
//                 <div className="text-sm muted">Status: {m.status}</div>
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>
//     </AppLayout>
//   );
// }


import { useEffect, useState } from "react";
import api from "../api/axios";

export default function MyMentorships() {
  const [mentorships, setMentorships] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/mentorships/my-mentorships")
      .then((res) => setMentorships(res.data?.mentorships || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 animate-fadeIn">
      <h2 className="text-2xl font-semibold">My Mentorships</h2>

      {loading && <div>Loading…</div>}

      {!loading && mentorships.length === 0 && (
        <div className="card p-8 text-center">
          <div className="text-3xl mb-2">🤝</div>
          <h3 className="font-semibold">No mentorships yet</h3>
          <p className="text-sm text-gray-600 mt-1">
            Browse mentors and book your first session.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {mentorships.map((m) => (
          <div key={m.id} className="p-4 card">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">
                  With: {m.mentor?.name || m.mentee?.name}
                </div>
                <div className="text-sm text-gray-500">
                  Topic: {m.topic}
                </div>
              </div>
              <div className="text-sm text-gray-500">
                Status: {m.status}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
