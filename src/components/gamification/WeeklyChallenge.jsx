// src/components/gamification/WeeklyChallenge.jsx
import React from 'react';
import { useGamificationStore } from '../../stores/useGamificationStore';

export default function WeeklyChallenge() {
  const challenge = useGamificationStore(s => s.weeklyChallenge);

  if (!challenge) return null;

  const pct = challenge.target > 0
    ? Math.min(100, Math.round((challenge.progress / challenge.target) * 100))
    : 0;

  return (
    <div className="weekly-card">
      <div className="weekly-header">
        <span className="weekly-title">Weekly Challenge</span>
        <span className="weekly-xp">+{challenge.xpReward} XP</span>
      </div>

      <p className="weekly-label">{challenge.label}</p>

      {challenge.completed ? (
        <div className="weekly-done">
          Done ✓ +{challenge.xpReward} XP
        </div>
      ) : (
        <>
          <div className="progress-bar" style={{ marginTop: 8 }}>
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="weekly-progress-text">
            {challenge.progress} / {challenge.target}
          </div>
        </>
      )}
    </div>
  );
}
