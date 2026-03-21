// src/components/ui/CascadeShiftBanner.jsx
import React, { useState } from 'react';
import { useCalendarStore } from '../../stores/useCalendarStore';
import { useGoalsStore } from '../../stores/useGoalsStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useUIStore } from '../../stores/useUIStore';
import { formatDate } from '../../utils/dateUtils';

export default function CascadeShiftBanner() {
  const { uid } = useAuthStore();
  const { pendingShift, cascadeShift, dismissShift } = useCalendarStore();
  const goals = useGoalsStore(s => s.goals);
  const showToast = useUIStore(s => s.showToast);
  const [isShifting, setIsShifting] = useState(false);

  if (!pendingShift) return null;
  const { missedDates, totalDays } = pendingShift;
  const firstMissed = missedDates[0];
  const lastMissed = missedDates[missedDates.length - 1];

  const handleShift = async () => {
    setIsShifting(true);
    try {
      const result = await cascadeShift(
        uid,
        goals.gateExamDate,
        firstMissed,
        totalDays
      );
      if (result.warnings?.length > 0) {
        result.warnings.forEach(w => showToast(w, 'warning', 8000));
      }
      showToast(`Schedule shifted forward by ${totalDays} day${totalDays > 1 ? 's' : ''}. ${result.shiftedCount} events updated.`, 'success');
    } catch (e) {
      showToast('Failed to shift schedule. Please try again.', 'error');
    }
    setIsShifting(false);
  };

  const handleManual = () => dismissShift();

  return (
    <div className="mx-6 mt-4 border border-accent-orange/30 bg-accent-orange/5 rounded-lg px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="text-accent-orange mt-0.5 shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-text-primary text-sm font-medium">
            {totalDays === 1
              ? `You missed ${formatDate(firstMissed, 'MMM d')}`
              : `You missed ${totalDays} days (${formatDate(firstMissed, 'MMM d')} – ${formatDate(lastMissed, 'MMM d')})`}
          </p>
          <p className="text-text-secondary text-xs mt-0.5">
            Your schedule is {totalDays} day{totalDays > 1 ? 's' : ''} behind ideal. What do you want to do?
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-3 ml-7">
        <button
          onClick={handleShift}
          disabled={isShifting}
          className="bg-accent-orange/20 border border-accent-orange/40 text-accent-orange text-xs px-3 py-1.5 rounded-md font-medium hover:bg-accent-orange/30 transition-colors disabled:opacity-50"
        >
          {isShifting ? 'Shifting...' : `Shift everything forward ${totalDays} day${totalDays > 1 ? 's' : ''}`}
        </button>
        <button
          onClick={handleManual}
          className="text-text-secondary text-xs hover:text-text-primary transition-colors"
        >
          I'll handle it manually
        </button>
      </div>
    </div>
  );
}
