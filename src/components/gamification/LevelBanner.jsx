// src/components/gamification/LevelBanner.jsx
import React from 'react';
import { useGamificationStore } from '../../stores/useGamificationStore';

export default function LevelBanner() {
  const leveledUp      = useGamificationStore(s => s.leveledUp);
  const newLevelInfo   = useGamificationStore(s => s.newLevelInfo);
  const streakMilestone = useGamificationStore(s => s.streakMilestoneBanner);
  const dismissLevel   = useGamificationStore(s => s.dismissLevelUp);
  const dismissMilestone = useGamificationStore(s => s.dismissStreakMilestone);

  if (!leveledUp && !streakMilestone) return null;

  return (
    <div className="level-banner" role="alert">
      {leveledUp && newLevelInfo && (
        <div className="level-banner-inner">
          <span className="level-banner-icon">▲</span>
          <span className="level-banner-text">
            Level up! You're now <strong>Level {newLevelInfo.level} — {newLevelInfo.name}</strong>
          </span>
          <button className="level-banner-close" onClick={dismissLevel} aria-label="Dismiss">✕</button>
        </div>
      )}
      {streakMilestone && (
        <div className="level-banner-inner level-banner-streak">
          <span className="level-banner-icon">🔥</span>
          <span className="level-banner-text">
            Streak milestone: <strong>{streakMilestone} days in a row!</strong> Keep going.
          </span>
          <button className="level-banner-close" onClick={dismissMilestone} aria-label="Dismiss">✕</button>
        </div>
      )}
    </div>
  );
}
