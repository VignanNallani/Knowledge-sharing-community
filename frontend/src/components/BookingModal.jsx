// import React, { useState } from "react";
// import api from "../api/axios";

// export default function BookingModal({ mentor, onClose, onBooked }) {
//   const [topic, setTopic] = useState("");
//   const [slot, setSlot] = useState("");
//   const [loading, setLoading] = useState(false);

//   if (!mentor) return null;

//   const submit = async () => {
//     if (!topic.trim()) return alert("Please enter a topic");
//     setLoading(true);
//     try {
//       if (slot) {
//         const booking = await api.post("/api/slots/book", { slotId: slot });
//         alert(booking.data?.message || "Slot booked");
//         onBooked?.(booking.data?.booking || booking.data);
//         onClose();
//         return;
//       }

//       const res = await api.post("/api/mentorship/request", {
//         mentorId: mentor.id,
//         topic,
//         preferredSlot: slot || null,
//       });

//       alert(res.data?.message || "Request sent successfully!");
//       onBooked?.(res.data?.mentorship || res.data);
//       onClose();
//     } catch (err) {
//       alert(err?.response?.data?.message || "Failed to request mentorship");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
//       {/* Backdrop */}
//       <div
//         className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
//         onClick={onClose}
//       />

//       {/* Modal Content */}
//       <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8 animate-fadeUp overflow-hidden">
//         {/* Decorative Top */}
//         <div className="absolute top-0 left-0 w-full h-1 bg-[var(--accent-gradient)]"></div>

//         <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-1">
//           Book Session
//         </h3>
//         <p className="text-[var(--text-secondary)] mb-6">
//           with <span className="font-semibold text-indigo-600">{mentor.name}</span>
//         </p>

//         <div className="space-y-5">
//           <div>
//             <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
//               What do you want to discuss?
//             </label>
//             <input
//               value={topic}
//               onChange={(e) => setTopic(e.target.value)}
//               placeholder="Ex: Code review, Career advice, React hooks..."
//               className="glass-input"
//               autoFocus
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
//               Select Date & Time
//             </label>
//             <input
//               type="datetime-local"
//               value={slot}
//               onChange={(e) => setSlot(e.target.value)}
//               className="glass-input"
//             />
//             <p className="text-xs text-[var(--text-secondary)] mt-2">
//               * Time is in your local timezone.
//             </p>
//           </div>
//         </div>

//         <div className="mt-8 flex justify-end gap-3">
//           <button
//             className="btn btn-ghost"
//             onClick={onClose}
//             disabled={loading}
//           >
//             Cancel
//           </button>
//           <button
//             className="btn btn-primary min-w-[120px]"
//             onClick={submit}
//             disabled={loading}
//           >
//             {loading ? "Confirming..." : "Confirm Booking"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }


import React, { useState } from "react";
import api from "../api/axios";

export default function BookingModal({ mentor, onClose, onBooked }) {
  const [topic, setTopic] = useState("");
  const [slot, setSlot] = useState("");
  const [loading, setLoading] = useState(false);

  if (!mentor) return null;

  const submit = async () => {
    if (!topic.trim()) return alert("Please enter a topic");
    setLoading(true);
    try {
      if (slot) {
        const booking = await api.post("/api/slots/book", { slotId: slot });
        alert(booking.data?.message || "Slot booked");
        onBooked?.(booking.data?.booking || booking.data);
        onClose();
        return;
      }

      const res = await api.post("/api/mentorship/request", {
        mentorId: mentor.id,
        topic,
        preferredSlot: slot || null,
      });

      alert(res.data?.message || "Request sent successfully!");
      onBooked?.(res.data?.mentorship || res.data);
      onClose();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to request mentorship");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8 animate-fadeUp overflow-hidden">
        {/* Decorative Top */}
        <div className="absolute top-0 left-0 w-full h-1 bg-[var(--accent-gradient)]"></div>

        <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-1">
          Book Session
        </h3>
        <p className="text-[var(--text-secondary)] mb-6">
          with <span className="font-semibold text-indigo-600">{mentor.name}</span>
        </p>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
              What do you want to discuss?
            </label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex: Code review, Career advice, React hooks..."
              className="glass-input"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
              Select Date & Time
            </label>
            <input
              type="datetime-local"
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
              className="glass-input"
            />
            <p className="text-xs text-[var(--text-secondary)] mt-2">
              * Time is in your local timezone.
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            className="btn btn-ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary min-w-[120px]"
            onClick={submit}
            disabled={loading}
          >
            {loading ? "Confirming..." : "Confirm Booking"}
          </button>
        </div>
      </div>
    </div>
  );
}

