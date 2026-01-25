// import React, { useEffect, useState } from "react";
// import api from "../api/axios";
// // import AppLayout from "../components/AppLayout";
// import AppLayout from "../layouts/AppLayout";

// import MentorCard from "../components/MentorCard";
// import BookingModal from "../components/BookingModal";

// export default function Mentors() {
//   const [mentors, setMentors] = useState([]);
//   const [selected, setSelected] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     setLoading(true);
//     api.get("/api/mentorship/find")
//       .then((res) => setMentors(res.data.mentors || res.data))
//       .catch((err) => console.error(err))
//       .finally(() => setLoading(false));
//   }, []);

//   return (
//     <div className="animate-fadeIn">
//       {/* PAGE HEADER */}
//       <div className="mb-10 text-center md:text-left">
//         <h1 className="text-3xl font-extrabold text-[var(--text-primary)]">
//           Find a <span className="text-gradient">Mentor</span>
//         </h1>
//         <p className="text-[var(--text-secondary)] mt-2 max-w-2xl text-lg">
//           Connect with industry experts for guidance, code reviews, and career advice.
//         </p>
//       </div>

//       {loading ? (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//           {[1, 2, 3, 4, 5, 6].map((i) => (
//             <div key={i} className="h-64 rounded-2xl bg-gray-100 animate-pulse"></div>
//           ))}
//         </div>
//       ) : (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//           {mentors.map((m) => (
//             <MentorCard key={m.id} mentor={m} onBook={() => setSelected(m)} />
//           ))}
//         </div>
//       )}

//       {selected && (
//         <BookingModal
//           mentor={selected}
//           onClose={() => setSelected(null)}
//           onBooked={() => {
//             // Optional: Show toast
//             setSelected(null);
//           }}
//         />
//       )}
//     </div>
//   );
// }


import { useEffect, useState } from "react";
import api from "../api/axios";

import MentorCard from "../components/MentorCard";
import BookingModal from "../components/BookingModal";

export default function Mentors() {
  const [mentors, setMentors] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get("/api/mentorship/find")
      .then((res) => setMentors(res.data.mentors || res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold">
          Find a <span className="text-gradient">Mentor</span>
        </h1>
        <p className="mt-2 text-gray-600 max-w-2xl">
          Connect with industry experts for guidance, reviews, and career growth.
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-64 rounded-2xl bg-gray-100 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mentors.map((m) => (
            <MentorCard key={m.id} mentor={m} onBook={() => setSelected(m)} />
          ))}
        </div>
      )}

      {selected && (
        <BookingModal
          mentor={selected}
          onClose={() => setSelected(null)}
          onBooked={() => setSelected(null)}
        />
      )}
    </div>
  );
}
