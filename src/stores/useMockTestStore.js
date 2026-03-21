// src/stores/useMockTestStore.js
import { create } from 'zustand';
import { saveMockTest, deleteMockTest, loadMockTests, cacheRead } from '../firebase/firestore';
import { nanoid } from '../utils/nanoid';

export const useMockTestStore = create((set, get) => ({
  tests: {},
  isLoaded: false,

  loadTests: async (uid) => {
    const cached = cacheRead(`mocktests_${uid}`);
    if (cached) set({ tests: cached, isLoaded: true });
    const data = await loadMockTests(uid);
    set({ tests: data || {}, isLoaded: true });
  },

  addTest: async (uid, testData) => {
    const id = nanoid();
    const test = {
      id, date: '', testName: '', platform: 'Self',
      scored: 0, totalMarks: 100, percentile: null,
      subjectBreakdown: {}, notes: '',
      ...testData,
    };
    set(s => ({ tests: { ...s.tests, [id]: test } }));
    await saveMockTest(uid, id, test);

    // Gamification
    try {
      const { useGamificationStore } = await import('./useGamificationStore');
      const gam = useGamificationStore.getState();
      const allTests = { ...get().tests, [id]: test };

      gam.awardXP(30, 'Mock test logged');
      gam.updateChallengeProgress('mock_test');

      const sorted = Object.values(allTests)
        .filter(t => t.totalMarks > 0)
        .sort((a, b) => a.date.localeCompare(b.date));
      if (sorted.length >= 2) {
        const prev = sorted[sorted.length - 2];
        const curr = sorted[sorted.length - 1];
        if ((curr.scored / curr.totalMarks) > (prev.scored / prev.totalMarks)) {
          gam.awardXP(100, 'Mock score improved');
        }
      }
      gam.checkAndAwardBadges({ tests: allTests, subjects: {}, logs: {} });
    } catch {}

    return id;
  },

  updateTest: async (uid, id, updates) => {
    const current = get().tests[id];
    if (!current) return;
    const updated = { ...current, ...updates };
    set(s => ({ tests: { ...s.tests, [id]: updated } }));
    await saveMockTest(uid, id, updated);
  },

  deleteTest: async (uid, id) => {
    set(s => { const { [id]: _, ...rest } = s.tests; return { tests: rest }; });
    await deleteMockTest(uid, id);
  },

  getTestsSorted: () => Object.values(get().tests).sort((a, b) => b.date.localeCompare(a.date)),

  getScoreStats: () => {
    const tests = Object.values(get().tests);
    if (tests.length === 0) return null;
    const scores = tests.map(t => t.totalMarks > 0 ? (t.scored / t.totalMarks) * 100 : 0);
    return {
      best: Math.max(...scores).toFixed(1),
      avg: (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1),
      last: scores[0]?.toFixed(1),
    };
  },

  getSubjectWeaknessData: () => {
    const tests = Object.values(get().tests).filter(t => Object.keys(t.subjectBreakdown || {}).length > 0);
    if (tests.length < 3) return null;
    const totals = {};
    tests.forEach(t => {
      Object.entries(t.subjectBreakdown || {}).forEach(([subId, data]) => {
        if (!totals[subId]) totals[subId] = { correct: 0, attempted: 0 };
        totals[subId].correct += data.correct || 0;
        totals[subId].attempted += data.attempted || 0;
      });
    });
    return Object.entries(totals).map(([subId, { correct, attempted }]) => ({
      subjectId: subId,
      accuracy: attempted > 0 ? Math.round((correct / attempted) * 100) : 0,
    }));
  },
}));
