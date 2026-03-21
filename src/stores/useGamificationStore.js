// src/stores/useGamificationStore.js
import { create } from 'zustand';
import {
  loadStats, saveStats,
  loadStreak, saveStreak,
  loadBadges, saveBadges,
  loadWeeklyChallenge, saveWeeklyChallenge,
  loadMilestones, saveMilestones,
  loadXPLog, appendXPEvent,
} from '../firebase/gamification';

// ── LEVELS ────────────────────────────────────────────────────
export const LEVELS = [
  { level: 1,  min: 0,     max: 500,      name: 'Enrolled' },
  { level: 2,  min: 500,   max: 1500,     name: 'Aspirant' },
  { level: 3,  min: 1500,  max: 3000,     name: 'Grinder' },
  { level: 4,  min: 3000,  max: 6000,     name: 'Serious Dev' },
  { level: 5,  min: 6000,  max: 10000,    name: 'Algorithm Thinker' },
  { level: 6,  min: 10000, max: 15000,    name: 'Systems Designer' },
  { level: 7,  min: 15000, max: 22000,    name: 'OS Whisperer' },
  { level: 8,  min: 22000, max: 30000,    name: 'Network Sage' },
  { level: 9,  min: 30000, max: 42000,    name: 'TOC Master' },
  { level: 10, min: 42000, max: Infinity, name: 'GATE Ready' },
];

// ── BADGES ────────────────────────────────────────────────────
export const BADGE_DEFS = [
  { id: 'first_log',     name: 'First Log',        desc: 'Log study for the first time',              color: '#F97316' },
  { id: 'week_streak',   name: 'Week Warrior',      desc: 'Reach a 7-day study streak',                color: '#84CC16' },
  { id: 'month_streak',  name: 'Iron Discipline',   desc: 'Reach a 30-day study streak',               color: '#F97316' },
  { id: 'century',       name: 'Century',           desc: 'Log 100 total study days',                  color: '#FBBF24' },
  { id: 'first_subject', name: 'Subject Slayer',    desc: 'Complete any 1 subject',                    color: '#84CC16' },
  { id: 'five_subjects', name: 'Pentathlon',        desc: 'Complete 5 subjects',                       color: '#F97316' },
  { id: 'speed_runner',  name: 'Speed Runner',      desc: 'Complete a subject 3+ days before deadline',color: '#84CC16' },
  { id: 'mock_logger',   name: 'Test Taker',        desc: 'Log your first mock test',                  color: '#A78BFA' },
  { id: 'improving',     name: 'On the Rise',       desc: '3 consecutive mock test score improvements',color: '#84CC16' },
  { id: 'sniper',        name: 'Sniper',            desc: 'Score 90%+ on any mock test',               color: '#F97316' },
  { id: 'night_owl',     name: 'Night Owl',         desc: 'Submit a daily log after 11 PM',            color: '#A78BFA' },
  { id: 'early_bird',    name: 'Early Bird',        desc: 'Submit a daily log before 7 AM',            color: '#FBBF24' },
  { id: 'comeback',      name: 'Comeback Kid',      desc: 'Study again after a 5+ day gap',            color: '#F97316' },
  { id: 'full_syllabus', name: 'Full Stack',        desc: 'Complete all subjects',                     color: '#84CC16' },
  { id: 'gate_ready',    name: 'GATE Ready',        desc: 'Reach Level 10',                            color: '#F97316' },
];

// ── WEEKLY CHALLENGES (rotate by week) ───────────────────────
const WEEKLY_DEFS = [
  { type: 'topics',      label: 'Complete 15 topics this week',                        target: 15 },
  { type: 'hours',       label: 'Study 5+ hours on at least 4 days this week',         target: 4  },
  { type: 'mock_test',   label: 'Log a mock test this week',                           target: 1  },
  { type: 'units_daily', label: 'Complete at least 1 unit every day for 5 days',       target: 5  },
  { type: 'revision',    label: 'Do a revision session for any subject this week',      target: 1  },
];

const STREAK_MILESTONES = [7, 14, 21, 30, 60, 90];

// ── HELPERS ───────────────────────────────────────────────────
const todayISO = () => new Date().toISOString().split('T')[0];
const getWeekId  = () => Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));

const getLevelInfo = (xp) => {
  let lvl = LEVELS[0];
  for (const l of LEVELS) { if (xp >= l.min) lvl = l; }
  const nextLvl = LEVELS[lvl.level] || lvl;
  const progress = lvl.max === Infinity ? 100
    : Math.min(100, Math.round(((xp - lvl.min) / (lvl.max - lvl.min)) * 100));
  const xpToNext = lvl.max === Infinity ? 0 : lvl.max - xp;
  return { ...lvl, nextName: nextLvl.name, progress, xpToNext };
};

// ── STORE ─────────────────────────────────────────────────────
export const useGamificationStore = create((set, get) => ({
  // — State
  totalXP: 0,
  level: 1,
  levelName: 'Enrolled',
  levelProgress: 0,
  xpToNext: 500,
  streak: { currentStreak: 0, longestStreak: 0, lastLoggedDate: null, freezesAvailable: 2, lastFreezeReset: null },
  earnedBadges: [],
  weeklyChallenge: null,
  milestones: { shown: [] },
  xpLog: [],

  // — Transient UI flags (session-only, not persisted)
  leveledUp: false,
  newLevelInfo: null,
  bossSubjectId: null,
  streakMilestoneBanner: null,
  newBadgeId: null,
  isLoaded: false,

  // ── LOAD ─────────────────────────────────────────────────
  loadGamification: async () => {
    const [stats, streak, badges, challenge, milestones, xpLogData] = await Promise.all([
      loadStats(), loadStreak(), loadBadges(),
      loadWeeklyChallenge(), loadMilestones(), loadXPLog(),
    ]);
    const totalXP = stats.totalXP || 0;
    const lvl = getLevelInfo(totalXP);
    set({
      totalXP,
      level: lvl.level,
      levelName: lvl.name,
      levelProgress: lvl.progress,
      xpToNext: lvl.xpToNext,
      streak: { currentStreak: 0, longestStreak: 0, lastLoggedDate: null, freezesAvailable: 2, lastFreezeReset: null, ...streak },
      earnedBadges: badges.earned || [],
      weeklyChallenge: challenge,
      milestones: milestones || { shown: [] },
      xpLog: xpLogData.events || [],
      isLoaded: true,
    });
    get().initWeeklyChallenge();
  },

  // ── XP ────────────────────────────────────────────────────
  awardXP: (amount, label) => {
    const { totalXP, level } = get();
    const newXP = totalXP + amount;
    const prevLvl = getLevelInfo(totalXP);
    const newLvl  = getLevelInfo(newXP);
    const didLevelUp = newLvl.level > prevLvl.level;

    set({
      totalXP: newXP,
      level: newLvl.level,
      levelName: newLvl.name,
      levelProgress: newLvl.progress,
      xpToNext: newLvl.xpToNext,
      ...(didLevelUp ? { leveledUp: true, newLevelInfo: newLvl } : {}),
    });

    // Fire DOM event for XPFloat component
    window.dispatchEvent(new CustomEvent('xp-earned', { detail: { amount, label } }));

    // Persist (fire & forget)
    saveStats({ totalXP: newXP, level: newLvl.level, lastUpdated: todayISO() });
    const event = { date: todayISO(), label, amount, ts: Date.now() };
    appendXPEvent(event);
    set(s => ({ xpLog: [event, ...s.xpLog].slice(0, 20) }));

    if (newLvl.level === 10) get().awardBadge('gate_ready');
  },

  dismissLevelUp: () => set({ leveledUp: false, newLevelInfo: null }),

  // ── STREAK ───────────────────────────────────────────────
  processStreak: async () => {
    const { streak, milestones } = get();
    const today = todayISO();
    if (streak.lastLoggedDate === today) return; // already processed today

    // Monthly freeze reset
    const now = new Date();
    const thisMonthFirst = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    let newFreezes = (streak.lastFreezeReset && streak.lastFreezeReset >= thisMonthFirst)
      ? streak.freezesAvailable
      : 2;

    // Compute yesterday string
    const yest = new Date(); yest.setDate(yest.getDate() - 1);
    const yesterday = yest.toISOString().split('T')[0];

    let newCurrent;
    if (streak.lastLoggedDate === yesterday) {
      newCurrent = streak.currentStreak + 1;
    } else {
      // Gap — check comeback badge
      if (streak.lastLoggedDate) {
        const gap = Math.floor((new Date(today) - new Date(streak.lastLoggedDate)) / 86400000);
        if (gap >= 5) get().awardBadge('comeback');
      }
      newCurrent = 1;
    }

    const newLongest = Math.max(newCurrent, streak.longestStreak);
    const newStreakData = {
      currentStreak: newCurrent,
      longestStreak: newLongest,
      lastLoggedDate: today,
      freezesAvailable: newFreezes,
      lastFreezeReset: thisMonthFirst,
    };
    set({ streak: newStreakData });
    await saveStreak(newStreakData);

    // Streak milestone banners
    const shown = milestones.shown || [];
    const unshown = STREAK_MILESTONES.filter(m => newCurrent >= m && !shown.includes(m));
    if (unshown.length > 0) {
      const updated = [...shown, ...unshown];
      set({ milestones: { shown: updated }, streakMilestoneBanner: unshown[unshown.length - 1] });
      saveMilestones({ shown: updated });
    }

    // Streak badges
    if (newCurrent >= 7)  get().awardBadge('week_streak');
    if (newCurrent >= 30) get().awardBadge('month_streak');
  },

  useStreakFreeze: async () => {
    const { streak } = get();
    if (streak.freezesAvailable <= 0) return;
    const today = todayISO();
    const newStreak = { ...streak, freezesAvailable: streak.freezesAvailable - 1, lastLoggedDate: today };
    set({ streak: newStreak });
    await saveStreak(newStreak);
  },

  dismissStreakMilestone: () => set({ streakMilestoneBanner: null }),

  // ── BADGES ───────────────────────────────────────────────
  awardBadge: (badgeId) => {
    const { earnedBadges } = get();
    if (earnedBadges.find(b => b.id === badgeId)) return;
    const badge = { id: badgeId, earnedOn: todayISO() };
    const updated = [...earnedBadges, badge];
    set({ earnedBadges: updated, newBadgeId: badgeId });
    saveBadges({ earned: updated });
  },

  dismissNewBadge: () => set({ newBadgeId: null }),

  checkAndAwardBadges: (ctx) => {
    const { earnedBadges } = get();
    const has = (id) => earnedBadges.some(b => b.id === id);
    const { subjects = {}, tests = {}, logs = {}, hour, subjectId } = ctx;
    const completed = Object.values(subjects).filter(s => s.status === 'completed');

    if (!has('first_log')     && Object.keys(logs).length >= 1)   get().awardBadge('first_log');
    if (!has('century')       && Object.keys(logs).length >= 100)  get().awardBadge('century');
    if (!has('first_subject') && completed.length >= 1)            get().awardBadge('first_subject');
    if (!has('five_subjects') && completed.length >= 5)            get().awardBadge('five_subjects');
    if (!has('full_syllabus') && Object.keys(subjects).length > 0 && completed.length === Object.keys(subjects).length) {
      get().awardBadge('full_syllabus');
    }

    if (!has('speed_runner') && subjectId && subjects[subjectId]) {
      const s = subjects[subjectId];
      if (s.status === 'completed' && s.completedOn && s.plannedEndDate) {
        const diff = Math.round((new Date(s.plannedEndDate) - new Date(s.completedOn)) / 86400000);
        if (diff >= 3) get().awardBadge('speed_runner');
      }
    }

    if (!has('night_owl')  && hour !== undefined && hour >= 23) get().awardBadge('night_owl');
    if (!has('early_bird') && hour !== undefined && hour < 7)   get().awardBadge('early_bird');
    if (!has('mock_logger') && Object.keys(tests).length >= 1)  get().awardBadge('mock_logger');

    if (!has('sniper') && Object.values(tests).some(t => t.totalMarks > 0 && t.scored / t.totalMarks >= 0.9)) {
      get().awardBadge('sniper');
    }

    if (!has('improving')) {
      const sorted = Object.values(tests).sort((a, b) => a.date.localeCompare(b.date));
      if (sorted.length >= 3) {
        let cons = 0;
        for (let i = 1; i < sorted.length; i++) {
          const p = sorted[i-1].totalMarks > 0 ? sorted[i-1].scored / sorted[i-1].totalMarks : 0;
          const c = sorted[i].totalMarks   > 0 ? sorted[i].scored   / sorted[i].totalMarks   : 0;
          if (c > p) { cons++; if (cons >= 2) { get().awardBadge('improving'); break; } }
          else cons = 0;
        }
      }
    }
  },

  // ── BOSS BATTLE ──────────────────────────────────────────
  triggerBossBattle: (subjectId) => set({ bossSubjectId: subjectId }),
  dismissBossBattle: () => set({ bossSubjectId: null }),

  // ── WEEKLY CHALLENGE ─────────────────────────────────────
  initWeeklyChallenge: async () => {
    const { weeklyChallenge } = get();
    const weekId = getWeekId();
    if (weeklyChallenge && weeklyChallenge.weekId === weekId) return; // still current week
    const def = WEEKLY_DEFS[weekId % WEEKLY_DEFS.length];
    const next = { weekId, type: def.type, label: def.label, target: def.target, progress: 0, completed: false, xpReward: 150 };
    set({ weeklyChallenge: next });
    await saveWeeklyChallenge(next);
  },

  updateChallengeProgress: async (actionType) => {
    const { weeklyChallenge } = get();
    if (!weeklyChallenge || weeklyChallenge.completed) return;
    if (weeklyChallenge.weekId !== getWeekId()) { get().initWeeklyChallenge(); return; }

    // Map action → challenge type
    const match = {
      topics:      ['topics'],
      unit_done:   ['topics', 'units_daily'],
      study_hours: ['hours'],
      mock_test:   ['mock_test'],
      revision:    ['revision'],
    };
    const types = match[actionType] || [];
    if (!types.includes(weeklyChallenge.type)) return;

    const newProgress = Math.min(weeklyChallenge.progress + 1, weeklyChallenge.target);
    const completed   = newProgress >= weeklyChallenge.target;
    const updated = { ...weeklyChallenge, progress: newProgress, completed };
    set({ weeklyChallenge: updated });
    await saveWeeklyChallenge(updated);
    if (completed) get().awardXP(150, 'Weekly challenge completed');
  },

  // ── LEVEL INFO HELPER ────────────────────────────────────
  getLevelInfo: () => getLevelInfo(get().totalXP),
}));
