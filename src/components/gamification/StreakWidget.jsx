// src/components/gamification/StreakWidget.jsx
import React from 'react';
import { useGamificationStore } from '../../stores/useGamificationStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { todayISO } from '../../utils/dateUtils';
import { useDailyLogStore } from '../../stores/useDailyLogStore';

// Inline flame SVG — no external lib
function FlameIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#F97316" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 2C12 2 7 8 7 13a5 5 0 0 0 10 0c0-2.5-1.5-5-1.5-5S14 11 12 11c-1 0-2-1-2-2.5C10 7 12 2 12 2Z" />
    </svg>
  );
}

export default function StreakWidget() {
  const streak       = useGamificationStore(s => s.streak);
  const useFreeze    = useGamificationStore(s => s.useStreakFreeze);
  const uid          = useAuthStore(s => s.uid);
  const todayLog     = useDailyLogStore(s => s.todayLog);

  const today      = todayISO();
  const hour       = new Date().getHours();
  const hasLogged  = todayLog !== null || streak.lastLoggedDate === today;
  const canFreeze  = !hasLogged && hour >= 20 && streak.freezesAvailable > 0;

  const handleFreeze = async () => {
    await useFreeze();
  };

  return (
    <div className="streak-widget">
      <div className="streak-main">
        <FlameIcon size={28} />
        <div>
          <div className="streak-count">{streak.currentStreak}</div>
          <div className="streak-label">day streak</div>
        </div>
      </div>

      <div className="streak-best">
        Best: <span className="streak-best-val">{streak.longestStreak}</span> days
      </div>

      <div className="streak-freezes">
        {streak.freezesAvailable} freeze{streak.freezesAvailable !== 1 ? 's' : ''} left this month
      </div>

      {canFreeze && (
        <button className="streak-freeze-btn btn-secondary" onClick={handleFreeze}>
          Use Freeze — keep streak alive
        </button>
      )}
    </div>
  );
}
