// src/stores/useGoalsStore.js
import { create } from 'zustand';
import { saveGoals, loadGoals, cacheRead } from '../firebase/firestore';

const DEFAULT_GOALS = {
  gateExamDate: null,
  dailyHourTarget: 5,
  startDate: null,
  targetScore: null,
};

export const useGoalsStore = create((set, get) => ({
  goals: { ...DEFAULT_GOALS },
  isLoaded: false,

  loadGoals: async (uid) => {
    // Try cache first
    const cached = cacheRead(`goals_${uid}`);
    if (cached) set({ goals: { ...DEFAULT_GOALS, ...cached }, isLoaded: true });
    // Then Firestore
    const data = await loadGoals(uid);
    if (data) set({ goals: { ...DEFAULT_GOALS, ...data }, isLoaded: true });
    else set({ isLoaded: true });
  },

  updateGoals: async (uid, updates) => {
    const current = get().goals;
    const merged = { ...current, ...updates };
    set({ goals: merged });
    await saveGoals(uid, merged);
  },

  hasGoals: () => !!get().goals.gateExamDate,

  getDaysToExam: () => {
    const { gateExamDate } = get().goals;
    if (!gateExamDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exam = new Date(gateExamDate);
    exam.setHours(0, 0, 0, 0);
    return Math.ceil((exam - today) / (1000 * 60 * 60 * 24));
  },

  getPrepDay: () => {
    const { startDate } = get().goals;
    if (!startDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    return Math.max(1, Math.ceil((today - start) / (1000 * 60 * 60 * 24)) + 1);
  },
}));
