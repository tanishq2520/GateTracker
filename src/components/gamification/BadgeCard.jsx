// src/components/gamification/BadgeCard.jsx
import React from 'react';
import { BADGE_DEFS } from '../../stores/useGamificationStore';
import { formatDate } from '../../utils/dateUtils';

// Inline CSS-shape badge icons keyed by badge id
function BadgeIcon({ id, color, earned }) {
  const c = earned ? color : '#57534E';
  const icons = {
    first_log:     <circle cx="12" cy="12" r="8" fill={c} />,
    week_streak:   <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" fill={c} />,
    month_streak:  <><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" fill={c} /><circle cx="12" cy="12" r="3" fill="none" stroke="#1C1917" strokeWidth="1.5" /></>,
    century:       <text x="3" y="17" fontSize="11" fill={c} fontFamily="monospace" fontWeight="bold">100</text>,
    first_subject: <path d="M12 3L4 8v8l8 5 8-5V8z" fill={c} />,
    five_subjects: <><path d="M12 3L4 8v8l8 5 8-5V8z" fill={c} /><text x="9" y="14" fontSize="7" fill="#1C1917" fontWeight="bold">×5</text></>,
    speed_runner:  <path d="M5 12h14M15 7l5 5-5 5" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
    mock_logger:   <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12l2 2 4-4" stroke={c} strokeWidth="1.8" strokeLinecap="round" fill="none" />,
    improving:     <polyline points="3,17 8,11 13,14 21,7" stroke={c} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
    sniper:        <><circle cx="12" cy="12" r="9" stroke={c} strokeWidth="2" fill="none" /><circle cx="12" cy="12" r="2" fill={c} /><line x1="12" y1="3" x2="12" y2="7" stroke={c} strokeWidth="2" /><line x1="12" y1="17" x2="12" y2="21" stroke={c} strokeWidth="2" /><line x1="3" y1="12" x2="7" y2="12" stroke={c} strokeWidth="2" /><line x1="17" y1="12" x2="21" y2="12" stroke={c} strokeWidth="2" /></>,
    night_owl:     <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill={c} />,
    early_bird:    <><circle cx="12" cy="12" r="5" fill={c} /><line x1="12" y1="2" x2="12" y2="5" stroke={c} strokeWidth="2" /><line x1="12" y1="19" x2="12" y2="22" stroke={c} strokeWidth="2" /><line x1="2" y1="12" x2="5" y2="12" stroke={c} strokeWidth="2" /></>,
    comeback:      <path d="M4 12v-2a8 8 0 018-8 8 8 0 018 8v2M4 12l4-4M4 12l4 4" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" />,
    full_syllabus: <path d="M20 7L9 18l-5-5" stroke={c} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
    gate_ready:    <><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill={c} /></>,
  };

  return (
    <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      {icons[id] || <circle cx="12" cy="12" r="8" fill={c} />}
    </svg>
  );
}

export default function BadgeCard({ badgeDef, earnedOn }) {
  const earned = !!earnedOn;
  return (
    <div className={`badge-card ${earned ? 'badge-card--earned' : 'badge-card--locked'}`}>
      <div className="badge-icon-wrap" style={earned ? { color: badgeDef.color } : {}}>
        <BadgeIcon id={badgeDef.id} color={badgeDef.color} earned={earned} />
      </div>
      <div className="badge-name" style={earned ? { color: '#FAFAF9' } : {}}>
        {badgeDef.name}
      </div>
      <div className="badge-desc">{badgeDef.desc}</div>
      {earned && earnedOn && (
        <div className="badge-date">{formatDate(earnedOn, 'MMM d')}</div>
      )}
    </div>
  );
}

// Use this instead
export function AllBadges({ earnedBadges }) {
  const earnedMap = {};
  (earnedBadges || []).forEach(b => { earnedMap[b.id] = b.earnedOn; });
  return (
    <div className="badge-grid">
      {BADGE_DEFS.map(def => (
        <BadgeCard key={def.id} badgeDef={def} earnedOn={earnedMap[def.id] || null} />
      ))}
    </div>
  );
}
