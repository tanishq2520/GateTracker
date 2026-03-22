// src/components/layout/TopNav.jsx
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useGoalsStore } from '../../stores/useGoalsStore';
import { useGamificationStore } from '../../stores/useGamificationStore';
import { useUserProfileStore } from '../../stores/useUserProfileStore';
import { useAuth } from '../../context/AuthContext';
import ProfilePanel from '../profile/ProfilePanel';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/subjects', label: 'Subjects' },
  { to: '/mock-tests', label: 'Mock Tests' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/achievements', label: 'Achievements' },
  { to: '/settings', label: 'Settings' },
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
        <div className="nav-links-desktop" style={{ display: 'flex', alignItems: 'center', gap: '2px', flex: 1 }}>
          {NAV_ITEMS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                fontSize: '12.5px',
                color: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)',
                textDecoration: 'none',
                padding: '5px 10px',
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
                padding: '10px 12px',
                borderRadius: '8px',
                background: isActive ? 'rgba(255,255,255,0.09)' : 'transparent',
                fontFamily: 'var(--font-body)',
                fontWeight: isActive ? 500 : 400,
                display: 'block',
              })}
            >
              {label}
            </NavLink>
          ))}
        </div>
      )}

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
