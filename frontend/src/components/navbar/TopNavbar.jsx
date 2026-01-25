import { useAuth } from "../../context/AuthContext";

export default function TopNavbar() {
  const { user, signOut } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <input
        type="text"
        placeholder="Search discussions..."
        className="w-80 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-300"
      />

      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700">
          {user?.name}
        </span>
        <button
          onClick={signOut}
          className="text-sm text-gray-500 hover:text-black"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
