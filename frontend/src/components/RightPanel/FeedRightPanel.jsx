import React from "react";
import { Link } from "react-router-dom";

export default function RightPanel() {
    return (
        <div className="space-y-8 animate-in" style={{ animationDelay: '0.1s' }}>

            {/* ─── TRENDING ─── */}
            <div className="space-y-3">
                <h4 className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                    Trending Topics
                </h4>
                <ul className="space-y-1">
                    {[
                        "React Server Components",
                        "AI Engineering",
                        "System Design",
                        "Career Growth"
                    ].map((tag, i) => (
                        <li key={i}>
                            <Link to={`/t/${tag}`} className="flex items-center justify-between group py-1">
                                <span className="text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                                    #{tag}
                                </span>
                                {/* Optional count, visually minimized */}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>

            {/* ─── SUGGESTED ─── */}
            <div className="space-y-3">
                <h4 className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                    People to Follow
                </h4>
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-2.5 items-center group cursor-pointer">
                            <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden shrink-0">
                                <img src={`https://ui-avatars.com/api/?name=User+${i}&background=random`} className="w-full h-full object-cover" alt="" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium text-[var(--text-primary)] truncate">Sarah Smith</div>
                                <div className="text-xs text-[var(--text-secondary)] truncate">Eng Lead @ Stripe</div>
                            </div>
                            <button className="opacity-0 group-hover:opacity-100 text-xs font-semibold text-blue-600 transition-opacity">
                                Follow
                            </button>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}
