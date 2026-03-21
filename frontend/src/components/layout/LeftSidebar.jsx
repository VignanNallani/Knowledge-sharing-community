export default function LeftSidebar({ selectedTags = [], onToggleTag, sortBy, onSortChange }) {
  const topics = [
    "System Design",
    "Scaling", 
    "DevOps",
    "Code Reviews",
    "Debugging",
    "Career Growth",
    "React",
    "Backend",
    "Frontend",
    "Architecture",
    "Database",
    "Performance"
  ];

  const sortOptions = [
    { value: "latest", label: "Latest", icon: "🕐" },
    { value: "popular", label: "Most Popular", icon: "🔥" },
    { value: "discussed", label: "Most Discussed", icon: "💬" }
  ];

  return (
    <div className="space-y-6">
      {/* Sort Options */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-4 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m4 0l4 4m4-4h4M4 4v16" />
          </svg>
          Sort By
        </h3>
        <div className="space-y-1">
          {sortOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onSortChange?.(option.value)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center gap-3 ${
                sortBy === option.value
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span className="text-lg">{option.icon}</span>
              <span className="font-medium">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Topic Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-4 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          Filter by Tags
        </h3>
        <div className="flex flex-wrap gap-2">
          {topics.map((topic) => (
            <button
              key={topic}
              onClick={() => onToggleTag?.(topic)}
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                selectedTags.includes(topic)
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-blue-600 shadow-sm transform scale-105"
                  : "bg-white text-slate-700 border-slate-300 hover:border-blue-300 hover:bg-blue-50"
              }`}
            >
              {topic}
              {selectedTags.includes(topic) && (
                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Active Filters */}
      {selectedTags.length > 0 && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4">
          <h3 className="text-sm font-semibold text-blue-900 uppercase tracking-wide mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m4 0l4 4m4-4h4M4 4v16" />
            </svg>
            Active Filters
          </h3>
          <div className="space-y-2">
            {selectedTags.map((tag) => (
              <div
                key={tag}
                className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-blue-200"
              >
                <span className="text-sm font-medium text-blue-900">{tag}</span>
                <button
                  onClick={() => onToggleTag?.(tag)}
                  className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-100 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700 p-4 text-white">
        <h3 className="text-sm font-semibold uppercase tracking-wide mb-3 text-slate-300">
          Community Stats
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">Active Users</span>
            <span className="text-sm font-bold text-green-400">247</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">Total Posts</span>
            <span className="text-sm font-bold text-blue-400">1,429</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">Mentors Online</span>
            <span className="text-sm font-bold text-purple-400">18</span>
          </div>
        </div>
      </div>
    </div>
  );
}
