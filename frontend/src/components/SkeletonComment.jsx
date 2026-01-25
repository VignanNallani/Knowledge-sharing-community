

// import React from "react";

// export default function SkeletonComment() {
//   return (
//     <div className="flex gap-3 py-3 items-start">
//       <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
//       <div className="flex-1 space-y-2">
//         <div className="h-3 w-1/3 rounded bg-gray-200 animate-pulse" />
//         <div className="h-3 w-full rounded bg-gray-200 animate-pulse" />
//       </div>
//     </div>
//   );
// }




import React from "react";
import { motion } from "framer-motion";

export default function SkeletonComment() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex gap-3 py-3 items-start border-b border-gray-100"
    >
      <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-1/3 rounded bg-gray-200 animate-pulse" />
        <div className="h-3 w-full rounded bg-gray-200 animate-pulse" />
      </div>
    </motion.div>
  );
}
