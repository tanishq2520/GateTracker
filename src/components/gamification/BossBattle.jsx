// src/components/gamification/BossBattle.jsx
// Full-screen subject-completion overlay with CSS confetti.
import React, { useEffect } from 'react';
import { useGamificationStore } from '../../stores/useGamificationStore';
import { useSubjectsStore } from '../../stores/useSubjectsStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { saveSubject, todayISO } from '../../firebase/firestore';

const CONFETTI_COLORS = ['#F97316', '#84CC16', '#FBBF24', '#A78BFA', '#EF4444', '#FAFAF9', '#44403C'];
const CONFETTI_COUNT  = 36;

function Confetti() {
  return (
    <div className="boss-confetti" aria-hidden="true">
      {Array.from({ length: CONFETTI_COUNT }).map((_, i) => {
        const color  = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        const left   = `${Math.random() * 100}%`;
        const delay  = `${(Math.random() * 2).toFixed(2)}s`;
        const size   = `${6 + Math.random() * 8}px`;
        const dur    = `${1.8 + Math.random() * 1.5}s`;
        return (
          <div
            key={i}
            className="boss-confetti-dot"
            style={{ left, animationDelay: delay, width: size, height: size, background: color, animationDuration: dur }}
          />
        );
      })}
    </div>
  );
}

export default function BossBattle() {
  const bossSubjectId   = useGamificationStore(s => s.bossSubjectId);
  const dismissBoss     = useGamificationStore(s => s.dismissBossBattle);
  const subjects        = useSubjectsStore(s => s.subjects);
  const uid             = useAuthStore(s => s.uid);

  const subject = bossSubjectId ? subjects[bossSubjectId] : null;

  // Lock body scroll while open
  useEffect(() => {
    if (bossSubjectId) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [bossSubjectId]);

  if (!bossSubjectId || !subject) return null;

  const units     = subject.units || [];
  const doneUnits = units.filter(u => u.done).length;
  const startDate = subject.plannedStartDate || subject.completedOn;
  const daysTaken = startDate && subject.completedOn
    ? Math.max(1, Math.round((new Date(subject.completedOn) - new Date(startDate)) / 86400000))
    : null;

  const handleClose = () => {
    // Mark bossShown so overlay never shows again for this subject
    if (uid && bossSubjectId) {
      saveSubject(uid, bossSubjectId, { ...subject, bossShown: true });
    }
    dismissBoss();
  };

  return (
    <div className="boss-overlay" role="dialog" aria-modal="true">
      <Confetti />
      <div className="boss-card">
        <div className="boss-subject-color" style={{ background: subject.color }} />

        <div className="boss-subject-name" style={{ color: subject.color }}>
          {subject.name}
        </div>

        <h2 className="boss-headline">Subject Complete</h2>

        <div className="boss-xp">+500 XP</div>

        <div className="boss-stats">
          {daysTaken && <div className="boss-stat"><span className="boss-stat-val">{daysTaken}</span><span className="boss-stat-lbl">days taken</span></div>}
          <div className="boss-stat"><span className="boss-stat-val">{doneUnits}</span><span className="boss-stat-lbl">units done</span></div>
          <div className="boss-stat"><span className="boss-stat-val">{doneUnits * 10 + 500}</span><span className="boss-stat-lbl">total XP</span></div>
        </div>

        <button className="boss-close btn-secondary" onClick={handleClose}>
          Continue
        </button>
      </div>
    </div>
  );
}
