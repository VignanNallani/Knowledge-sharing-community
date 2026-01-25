


// import { Outlet } from "react-router-dom";
// import Sidebar from "../components/sidebar/Sidebar";
// import TopNavbar from "../components/navbar/TopNavbar";

// export default function AppLayout() {
//   return (
//     <div className="flex h-screen bg-gray-50">
//       {/* Sidebar */}
//       <Sidebar />

//       {/* Main content */}
//       <div className="flex flex-1 flex-col">
//         <TopNavbar />

//         <main className="flex-1 overflow-y-auto px-6 py-5">
//           <Outlet />
//         </main>
//       </div>
//     </div>
//   );
// }


import { Outlet } from "react-router-dom";
import Sidebar from "../components/sidebar/Sidebar";
import TopNavbar from "../components/navbar/TopNavbar";

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex flex-1 flex-col">
        <TopNavbar />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
