// src/stores/useDailyLogStore.js
import { create } from 'zustand';
import { saveDailyLog, loadDailyLogs, cacheRead, todayISO } from '../firebase/firestore';
import { toISODateString } from '../utils/dateUtils';

// Helper to calc totals
const calcTotals = (tasks = []) => {
  const totalPlannedHours = tasks.reduce((sum, t) => sum + (Number(t.estimatedHours) || 0), 0);
  const totalCompletedHours = tasks.filter(t => t.done).reduce((sum, t) => sum + (Number(t.estimatedHours) || 0), 0);
  return { totalPlannedHours, totalCompletedHours };
};

const normalizeTask = (task = {}) => ({
  ...task,
  done: Boolean(task.done),
  doneAt: task.doneAt ?? null,
  xpAwarded: Boolean(task.xpAwarded || task.done),
});

const normalizeLog = (log) => {
  if (!log) return null;
  const tasks = (log.tasks || []).map(normalizeTask);
  const totals = calcTotals(tasks);
  return {
    ...log,
    tasks,
    ...totals,
    sixHourRewardAwarded: Boolean(log.sixHourRewardAwarded || totals.totalCompletedHours >= 6),
    fiveHourChallengeAwarded: Boolean(log.fiveHourChallengeAwarded || totals.totalCompletedHours >= 5),
  };
};

const normalizeLogs = (logs = {}) => Object.fromEntries(
  Object.entries(logs).map(([date, log]) => [date, normalizeLog(log)])
);

export const useDailyLogStore = create((set, get) => ({
  logs: {},
  todayLog: null,
  isLoaded: false,

  loadLogs: async (uid) => {
    const cached = cacheRead(`logs_${uid}`);
    if (cached) {
      const normalizedCached = normalizeLogs(cached);
      set({ logs: normalizedCached, todayLog: normalizedCached[todayISO()] || null, isLoaded: true });
    }
    const data = normalizeLogs(await loadDailyLogs(uid));
    const today = todayISO();
    set({ logs: data || {}, todayLog: data?.[today] || null, isLoaded: true });
  },

  // Completely sets a day's log (useful for auto-creation from Quick Fill)
  setDailyLog: async (uid, date, logData) => {
    const log = normalizeLog({ ...logData, date });
    
    set(s => {
      const logs = { ...s.logs, [date]: log };
      return { logs, todayLog: logs[todayISO()] || null };
    });
    await saveDailyLog(uid, date, log);
  },

  addTask: async (uid, date, task) => {
    const currentLog = normalizeLog(get().logs[date] || { date, tasks: [], notes: '' });
    const tasks = [...(currentLog.tasks || []), normalizeTask(task)];
    const newLog = normalizeLog({ ...currentLog, tasks });
    
    set(s => {
      const logs = { ...s.logs, [date]: newLog };
      return { logs, todayLog: logs[todayISO()] || null };
    });
    await saveDailyLog(uid, date, newLog);
  },

  removeTask: async (uid, date, taskId) => {
    const currentLog = normalizeLog(get().logs[date]);
    if (!currentLog) return;

    const tasks = (currentLog.tasks || []).filter(t => t.id !== taskId);
    const newLog = normalizeLog({ ...currentLog, tasks });
    
    set(s => {
      const logs = { ...s.logs, [date]: newLog };
      return { logs, todayLog: logs[todayISO()] || null };
    });
    await saveDailyLog(uid, date, newLog);
  },

  updateTask: async (uid, date, taskId, updates) => {
    const currentLog = normalizeLog(get().logs[date]);
    if (!currentLog) return;

    const tasks = (currentLog.tasks || []).map(t =>
      t.id === taskId ? normalizeTask({ ...t, ...updates }) : t
    );
    const newLog = normalizeLog({ ...currentLog, tasks });

    set(s => {
      const logs = { ...s.logs, [date]: newLog };
      return { logs, todayLog: logs[todayISO()] || null };
    });
    await saveDailyLog(uid, date, newLog);
  },

  markTaskDone: async (uid, date, taskId, isDone) => {
    const currentLog = normalizeLog(get().logs[date]);
    if (!currentLog) return;

    let targetTask = null;
    let previousTask = null;
    const tasks = (currentLog.tasks || []).map(t => {
      if (t.id === taskId) {
        previousTask = t;
        targetTask = normalizeTask({
          ...t,
          done: isDone,
          doneAt: isDone ? new Date().toISOString() : null,
          xpAwarded: t.xpAwarded || isDone,
        });
        return targetTask;
      }
      return t;
    });

    const totalCompletedHours = tasks.filter(t => t.done).reduce((sum, t) => sum + (Number(t.estimatedHours) || 0), 0);
    const newLog = normalizeLog({
      ...currentLog,
      tasks,
      sixHourRewardAwarded: currentLog.sixHourRewardAwarded || totalCompletedHours >= 6,
      fiveHourChallengeAwarded: currentLog.fiveHourChallengeAwarded || totalCompletedHours >= 5,
    });
    
    set(s => {
      const logs = { ...s.logs, [date]: newLog };
      return { logs, todayLog: logs[todayISO()] || null };
    });
    await saveDailyLog(uid, date, newLog);

    // Gamification hook — trigger only when marking DONE, and only for today's logs
    // We do NOT trigger gamification if un-checking a task (isDone = false) or if it's a past date
    const firstCompletion = Boolean(
      isDone &&
      targetTask &&
      previousTask &&
      !previousTask.done &&
      !previousTask.xpAwarded &&
      date === todayISO()
    );

    if (firstCompletion) {
      try {
        const { useGamificationStore } = await import('./useGamificationStore');
        const gam = useGamificationStore.getState();
        const allLogs = get().logs;

        // +XP based on task estimated hours (e.g. 10 XP per hour, min 10)
        const xpToAward = Math.max(10, Math.round(targetTask.estimatedHours * 10));
        gam.awardXP(xpToAward, `Task done: ${targetTask.description.substring(0, 15)}...`);

        // Check if crossed the 6h threshold just now
        const previousCompleted = currentLog.totalCompletedHours || 0;
        if (!currentLog.sixHourRewardAwarded && previousCompleted < 6 && totalCompletedHours >= 6) {
          gam.awardXP(80, '6h+ study day');
        }

        // Check for 5h challenge progress
        if (!currentLog.fiveHourChallengeAwarded && totalCompletedHours >= 5 && previousCompleted < 5) {
          gam.updateChallengeProgress('study_hours');
        }

        // Streak processing only once per day ideally, but we can call it safely here
        // as it only increments if lastLoggedDate != today
        await gam.processStreak();

        const hour = new Date().getHours();
        gam.checkAndAwardBadges({ hour, logs: allLogs, subjects: {}, tests: {} });
      } catch (e) {
        console.error("Gamification error in markTaskDone", e);
      }
    }
  },

  updateNotes: async (uid, date, notes) => {
    const currentLog = normalizeLog(get().logs[date] || { date, tasks: [], totalPlannedHours: 0, totalCompletedHours: 0 });
    const newLog = normalizeLog({ ...currentLog, notes });
    
    set(s => {
      const logs = { ...s.logs, [date]: newLog };
      return { logs, todayLog: logs[todayISO()] || null };
    });
    await saveDailyLog(uid, date, newLog);
  },

  getTodayLog: () => get().logs[todayISO()] || null,
  getLogForDate: (date) => get().logs[date] || null,

  getLast30DaysData: () => {
    const logs = get().logs;
    const result = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = toISODateString(d);
      // Use totalCompletedHours instead of hoursStudied
      result.push({ 
        date: dateStr, 
        hours: logs[dateStr]?.totalCompletedHours || 0,
        planned: logs[dateStr]?.totalPlannedHours || 0 
      });
    }
    return result;
  },
}));
