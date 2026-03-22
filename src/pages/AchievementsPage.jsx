// src/pages/AchievementsPage.jsx
import React from 'react';
import { useGamificationStore, LEVELS, BADGE_DEFS } from '../stores/useGamificationStore';
import { AllBadges } from '../components/gamification/BadgeCard';

function Levelbar({ totalXP, level, levelName, levelProgress, xpToNext }) {
  const next = LEVELS[level] || LEVELS[LEVELS.length - 1];
  const isMax = level >= 10;
  return (
    <div className="ach-level-section">
      <div className="ach-level-row">
        <div>
          <div className="ach-level-num">Level {level}</div>
          <div className="ach-level-name">{levelName}</div>
        </div>
        <div className="ach-xp-total">{totalXP.toLocaleString()} XP</div>
      </div>
      <div className="progress-bar" style={{ height: 10, marginTop: 8 }}>
        <div className="progress-fill" style={{ width: `${isMax ? 100 : levelProgress}%` }} />
      </div>
      {!isMax && (
        <div className="ach-xp-to-next">
          {xpToNext.toLocaleString()} XP to Level {level + 1} — {next.name}
        </div>
      )}
      {isMax && <div className="ach-xp-to-next" style={{ color: '#F97316' }}>Max level reached! You're GATE Ready.</div>}
    </div>
  );
}

export default function AchievementsPage() {
  const totalXP       = useGamificationStore(s => s.totalXP);
  const level         = useGamificationStore(s => s.level);
  const levelName     = useGamificationStore(s => s.levelName);
  const levelProgress = useGamificationStore(s => s.levelProgress);
  const xpToNext      = useGamificationStore(s => s.xpToNext);
  const streak        = useGamificationStore(s => s.streak);
  const earnedBadges  = useGamificationStore(s => s.earnedBadges);
  const xpLog         = useGamificationStore(s => s.xpLog);
  const isLoaded      = useGamificationStore(s => s.isLoaded);

  if (!isLoaded) {
    return <div className="ach-loading">Loading achievements…</div>;
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 40, position: 'relative', zIndex: 1 }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'rgba(255,255,255,0.9)', letterSpacing: '-0.02em', marginBottom: 24 }}>Achievements</h1>

      {/* Level + XP */}
      <section className="liquid-glass ach-section" style={{ borderRadius: 16, padding: '24px', marginBottom: 16 }}>
        <h2 className="ach-section-title">Level Progress</h2>
        <Levelbar
          totalXP={totalXP} level={level} levelName={levelName}
          levelProgress={levelProgress} xpToNext={xpToNext}
        />
        <div className="ach-level-table">
          {LEVELS.map(l => (
            <div key={l.level} className={`ach-level-row-item ${l.level === level ? 'ach-level-row-item--current' : ''} ${l.level < level ? 'ach-level-row-item--done' : ''}`}>
              <span className="ach-lv-num">Lv {l.level}</span>
              <span className="ach-lv-name">{l.name}</span>
              <span className="ach-lv-xp">{l.max === Infinity ? `${l.min.toLocaleString()}+` : `${l.min.toLocaleString()} – ${l.max.toLocaleString()}`} XP</span>
            </div>
          ))}
        </div>
      </section>

      {/* Streak stats */}
      <section className="liquid-glass ach-section" style={{ borderRadius: 16, padding: '24px', marginBottom: 16 }}>
        <h2 className="ach-section-title">Study Streak</h2>
        <div className="ach-streak-stats">
          <div className="ach-streak-stat">
            <div className="ach-streak-val" style={{ color: '#F97316' }}>{streak.currentStreak}</div>
            <div className="ach-streak-lbl">Current streak</div>
          </div>
          <div className="ach-streak-stat">
            <div className="ach-streak-val">{streak.longestStreak}</div>
            <div className="ach-streak-lbl">Longest streak</div>
          </div>
          <div className="ach-streak-stat">
            <div className="ach-streak-val">{streak.freezesAvailable}</div>
            <div className="ach-streak-lbl">Freezes left</div>
          </div>
        </div>
      </section>

      {/* Badge trophy case */}
      <section className="liquid-glass ach-section" style={{ borderRadius: 16, padding: '24px', marginBottom: 16 }}>
        <h2 className="ach-section-title">
          Badges — {earnedBadges.length} / {BADGE_DEFS.length} earned
        </h2>
        <AllBadges earnedBadges={earnedBadges} />
      </section>

      {/* XP History */}
      <section className="liquid-glass ach-section" style={{ borderRadius: 16, padding: '24px', marginBottom: 16 }}>
        <h2 className="ach-section-title">XP History (last 20)</h2>
        {xpLog.length === 0 ? (
          <p className="ach-empty">No XP events yet. Start studying!</p>
        ) : (
          <div className="xp-log">
            {xpLog.map((ev, i) => (
              <div key={i} className="xp-log-row">
                <span className="xp-log-date">{ev.date}</span>
                <span className="xp-log-label">{ev.label}</span>
                <span className="xp-log-amount">+{ev.amount} XP</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
