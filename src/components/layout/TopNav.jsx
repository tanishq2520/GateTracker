// src/components/layout/TopNav.jsx
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useGoalsStore } from '../../stores/useGoalsStore';
import { useGamificationStore } from '../../stores/useGamificationStore';
import { useUserProfileStore } from '../../stores/useUserProfileStore';
import { useAuth } from '../../context/AuthContext';
import ProfilePanel from '../profile/ProfilePanel';
import MobileBangleNav from './MobileBangleNav';

const NavIcon = ({ path }) => {
  const icons = {
    '/dashboard': (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    '/calendar': (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    '/subjects': (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    '/mock-tests': (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    '/analytics': (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    '/achievements': (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3h14M5 3a2 2 0 00-2 2v3a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2M5 3v8m14-8v8M9 17v2m6-2v2m-3-2v2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 11l1.5 3.5H17l-2.8 2 1 3.5L12 18l-3.2 2 1-3.5L7 13.5h3.5z" />
      </svg>
    ),
    '/settings': (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    '/report-bug': (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    )
  };
  return icons[path] || null;
};

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/subjects', label: 'Subjects' },
  { to: '/mock-tests', label: 'Mock Tests' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/achievements', label: 'Achievements' },
  { to: '/settings', label: 'Settings' },
  { to: '/report-bug', label: 'Report Bug', secondary: true },
];

export default function TopNav() {
  const { user } = useAuth();
  const getDaysToExam = useGoalsStore((s) => s.getDaysToExam);
  const profile = useUserProfileStore((s) => s.profile);
  const currentLevel = useGamificationStore((s) => s.level);
  const xpProgress = useGamificationStore((s) => s.levelProgress);
  const totalXP = useGamificationStore((s) => s.totalXP);

  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleProfileOpen = React.useCallback((open) => {
    setProfileOpen(open);
  }, []);

  const daysLeft = getDaysToExam();
  const displayName = profile?.displayName || user?.displayName || 'User';
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <>
      {/* ── Top Nav Bar ── */}
      <nav
        className="liquid-glass"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          padding: '10px 28px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          borderRadius: 0,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Logo */}
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '18px',
            color: 'rgba(255,255,255,0.95)',
            letterSpacing: '-0.02em',
            marginRight: '20px',
            flexShrink: 0,
          }}
        >
          GATE CS
        </span>

        {/* Desktop Nav Links */}
        <div className="nav-links-desktop" style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, marginLeft: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            {NAV_ITEMS.filter(item => !item.secondary).map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                style={({ isActive }) => ({
                  fontSize: '12px',
                  color: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)',
                  textDecoration: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: isActive ? 'rgba(255,255,255,0.09)' : 'transparent',
                  transition: 'all 0.2s',
                  fontFamily: 'var(--font-body)',
                  fontWeight: isActive ? 500 : 400,
                  whiteSpace: 'nowrap',
                })}
              >
                {label}
              </NavLink>
            ))}
          </div>
          
          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '0 8px' }} />

          {NAV_ITEMS.filter(item => item.secondary).map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                fontSize: '11px',
                color: isActive ? '#F97316' : 'rgba(249,115,22,0.5)',
                textDecoration: 'none',
                padding: '5px 10px',
                borderRadius: '6px',
                background: isActive ? 'rgba(249,115,22,0.1)' : 'transparent',
                border: `1px solid ${isActive ? 'rgba(249,115,22,0.2)' : 'transparent'}`,
                transition: 'all 0.2s',
                fontFamily: 'var(--font-mono)',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                textTransform: 'uppercase',
                letterSpacing: '0.02em'
              })}
            >
              {label}
            </NavLink>
          ))}
        </div>

        {/* Right side — XP pill + countdown + avatar */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          {/* XP / Level pill */}
          <div
            className="liquid-glass"
            style={{
              padding: '4px 12px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}>
              Lv {currentLevel || 1}
            </span>
            <div style={{ width: '48px', height: '2px', background: 'rgba(255,255,255,0.1)', borderRadius: '1px' }}>
              <div
                style={{
                  width: `${Math.min(xpProgress || 0, 100)}%`,
                  height: '100%',
                  background: '#F97316',
                  borderRadius: '1px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
            <span style={{ fontSize: '10px', color: '#F97316', fontFamily: 'var(--font-mono)' }}>
              {totalXP || 0} XP
            </span>
          </div>

          {/* Days countdown */}
          {daysLeft !== null && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: '#F97316',
                whiteSpace: 'nowrap',
              }}
            >
              {daysLeft}d to GATE
            </span>
          )}

          {/* Avatar */}
          <div
            onClick={() => setProfileOpen(true)}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#F97316',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 700,
              color: '#1C1917',
              flexShrink: 0,
              fontFamily: 'var(--font-mono)',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            title={displayName}
          >
            {initials || 'U'}
          </div>

          {/* Mobile Hamburger */}
          <button
            className="hamburger-btn"
            onClick={() => setMobileOpen((prev) => !prev)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: 'rgba(255,255,255,0.7)',
              display: 'none',
            }}
            aria-label="Toggle menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <div
          className="liquid-glass-strong mobile-menu"
          style={{
            position: 'fixed',
            top: '57px',
            left: 0,
            right: 0,
            zIndex: 49,
            padding: '8px 16px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {NAV_ITEMS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              style={({ isActive }) => ({
                fontSize: '14px',
                color: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.55)',
                textDecoration: 'none',
                padding: '12px 14px',
                borderRadius: '8px',
                background: isActive ? 'rgba(255,255,255,0.09)' : 'transparent',
                fontFamily: 'var(--font-body)',
                fontWeight: isActive ? 500 : 400,
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              })}
            >
              <span style={{ color: 'inherit', display: 'flex', flexShrink: 0 }}><NavIcon path={to} /></span>
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      )}

      {/* Bottom Nav Bar (Mobile Only) */}
      <MobileBangleNav onProfileOpen={handleProfileOpen} />

      {/* Profile Panel */}
      <ProfilePanel open={profileOpen} onClose={() => setProfileOpen(false)} />

      {/* Responsive styles injected */}
      <style>{`
        @media (max-width: 768px) {
          .nav-links-desktop { display: none !important; }
          .hamburger-btn { display: flex !important; }
        }
      `}</style>
    </>
  );
}
