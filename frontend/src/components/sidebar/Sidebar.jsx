import { useAuth } from "../../context/AuthContext";
import SidebarItem from "./SidebarItem";

export default function Sidebar() {
  const { role } = useAuth();

  return (
    <aside className="w-64 bg-black text-white flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 font-semibold text-lg border-b border-neutral-800">
        Knowledge
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-6 text-sm">
        <div>
          <p className="px-3 mb-2 text-xs text-neutral-400 uppercase">
            Community
          </p>
          <SidebarItem label="Feed" to="/" />
          <SidebarItem label="Create Post" to="/posts/new" />
          <SidebarItem label="Mentorship" to="/mentorship" />
        </div>

        {role === "ADMIN" && (
          <div>
            <p className="px-3 mb-2 text-xs text-neutral-400 uppercase">
              Admin
            </p>
            <SidebarItem label="Dashboard" to="/admin/dashboard" />
          </div>
        )}
      </nav>
    </aside>
  );
}
