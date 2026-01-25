export default function RoleBadge({ role }) {
  if (!role) return null;

  const styles = {
    admin: "bg-red-100 text-red-700 border-red-200",
    mentor: "bg-purple-100 text-purple-700 border-purple-200",
    user: "bg-gray-100 text-gray-600 border-gray-200",
  };

  return (
    <span
      className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wide ${styles[role]}`}
    >
      {role}
    </span>
  );
}
