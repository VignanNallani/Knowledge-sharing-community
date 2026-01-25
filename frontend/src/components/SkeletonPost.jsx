
// import React from "react";
// import { motion } from "framer-motion";

// export default function SkeletonPost() {
//   return (
//     <motion.div
//       layout
//       initial={{ opacity: 0 }}
//       animate={{ opacity: 1 }}
//       className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm"
//     >
//       {/* Header */}
//       <div className="flex items-center gap-3 mb-5">
//         <div className="w-10 h-10 rounded-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer" />
//         <div className="flex-1 space-y-2">
//           <div className="h-3 w-1/2 rounded bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer" />
//           <div className="h-2 w-1/4 rounded bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer" />
//         </div>
//       </div>

//       {/* Content */}
//       <div className="space-y-3">
//         <div className="h-3 w-full rounded bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer" />
//         <div className="h-3 w-5/6 rounded bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer" />
//         <div className="h-3 w-3/4 rounded bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer" />
//       </div>

//       {/* Actions */}
//       <div className="mt-5 flex gap-4">
//         <div className="h-3 w-12 rounded bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer" />
//         <div className="h-3 w-16 rounded bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer" />
//       </div>
//     </motion.div>
//   );
// }



import React from "react";
import { motion } from "framer-motion";

export default function SkeletonPost() {
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/2 rounded bg-gray-200 animate-pulse" />
          <div className="h-2 w-1/4 rounded bg-gray-200 animate-pulse" />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-3">
        <div className="h-3 w-full rounded bg-gray-200 animate-pulse" />
        <div className="h-3 w-5/6 rounded bg-gray-200 animate-pulse" />
        <div className="h-3 w-3/4 rounded bg-gray-200 animate-pulse" />
      </div>

      {/* Actions */}
      <div className="mt-5 flex gap-4">
        <div className="h-3 w-12 rounded bg-gray-200 animate-pulse" />
        <div className="h-3 w-16 rounded bg-gray-200 animate-pulse" />
      </div>
    </motion.div>
  );
}
