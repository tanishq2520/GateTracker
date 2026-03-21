// src/components/layout/Sidebar.jsx
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useGoalsStore } from '../../stores/useGoalsStore';
import { useGamificationStore } from '../../stores/useGamificationStore';

const NAV_ITEMS = [
  { to: '/dashboard',    label: 'Dashboard' },
  { to: '/calendar',     label: 'Calendar' },
  { to: '/subjects',     label: 'Subjects' },
  { to: '/mock-tests',   label: 'Mock Tests' },
  { to: '/analytics',    label: 'Analytics' },
  { to: '/achievements', label: 'Achievements' },
  { to: '/settings',     label: 'Settings' },
];

const NavIcon = ({ path }) => {
  const icons = {
    '/dashboard': (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    '/calendar': (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    '/subjects': (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    '/mock-tests': (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    '/analytics': (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    '/achievements': (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3h14M5 3a2 2 0 00-2 2v3a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2M5 3v8m14-8v8M9 17v2m6-2v2m-3-2v2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 11l1.5 3.5H17l-2.8 2 1 3.5L12 18l-3.2 2 1-3.5L7 13.5h3.5z" />
      </svg>
    ),
    '/settings': (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  };
  return icons[path] || null;
};

export default function Sidebar() {
  const getDaysToExam    = useGoalsStore(s => s.getDaysToExam);
  const goals            = useGoalsStore(s => s.goals);
  const level            = useGamificationStore(s => s.level);
  const levelName        = useGamificationStore(s => s.levelName);
  const levelProgress    = useGamificationStore(s => s.levelProgress);
  const xpToNext         = useGamificationStore(s => s.xpToNext);
  const daysLeft         = getDaysToExam();

  return (
    <aside className="hidden md:flex flex-col w-[220px] border-r border-border bg-surface h-full shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <div className="text-text-primary font-mono text-sm font-medium">GATE CS TRACKER</div>
        <div className="text-text-muted text-xs mt-0.5 font-mono">Study Planner</div>
      </div>

      {/* Exam countdown */}
      {daysLeft !== null && (
        <div className="px-4 pt-4">
          <div className="bg-nav-active border border-border rounded-md px-3 py-2">
            <div className="text-accent font-data text-sm font-semibold">{daysLeft}d</div>
            <div className="text-text-muted text-xs font-mono mt-0.5">days to GATE</div>
            {goals.gateExamDate && (
              <div className="text-text-muted text-xs font-mono">
                {new Date(goals.gateExamDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-nav-active text-accent'
                  : 'text-text-secondary hover:text-text-primary hover:bg-nav-active/60'
              }`
            }
          >
            <span className="shrink-0"><NavIcon path={to} /></span>
            <span className="font-sans">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Level widget */}
      <div className="sidebar-level-widget">
        <div className="sidebar-level-row">
          <span className="sidebar-level-name">{levelName}</span>
          <span className="sidebar-level-num">Lv {level}</span>
        </div>
        <div className="progress-bar" style={{ height: 4 }}>
          <div className="progress-fill" style={{ width: `${levelProgress}%` }} />
        </div>
        {level < 10 && (
          <div className="sidebar-xp-to-next">{xpToNext.toLocaleString()} XP to next</div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border">
        <p className="text-text-muted text-xs font-mono">Honest tracking.</p>
      </div>
    </aside>
  );
}
