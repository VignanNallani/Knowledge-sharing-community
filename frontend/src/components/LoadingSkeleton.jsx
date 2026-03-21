export default function LoadingSkeleton() {
  return (
    <div className="card animate-pulse">
      {/* Header: Avatar + User Info */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-11 h-11 rounded-full bg-[var(--border-light)]"></div>
        <div className="flex-1">
          <div className="h-4 bg-[var(--border-light)] rounded w-24 mb-2"></div>
          <div className="h-3 bg-[var(--border-light)] rounded w-16"></div>
        </div>
      </div>

      {/* Title */}
      <div className="h-6 bg-[var(--border-light)] rounded w-3/4 mb-3"></div>

      {/* Content lines */}
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-[var(--border-light)] rounded w-full"></div>
        <div className="h-4 bg-[var(--border-light)] rounded w-5/6"></div>
        <div className="h-4 bg-[var(--border-light)] rounded w-4/5"></div>
      </div>

      {/* Tags */}
      <div className="flex gap-2 mb-4">
        <div className="h-6 bg-[var(--border-light)] rounded-full w-16"></div>
        <div className="h-6 bg-[var(--border-light)] rounded-full w-20"></div>
        <div className="h-6 bg-[var(--border-light)] rounded-full w-14"></div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--border-light)]">
        <div className="flex gap-4">
          <div className="h-8 bg-[var(--border-light)] rounded w-16"></div>
          <div className="h-8 bg-[var(--border-light)] rounded w-12"></div>
          <div className="h-8 bg-[var(--border-light)] rounded w-10"></div>
        </div>
        <div className="h-8 bg-[var(--border-light)] rounded w-8"></div>
      </div>
    </div>
  )
}
