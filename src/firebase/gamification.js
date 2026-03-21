// src/firebase/gamification.js
// Firestore read/write helpers for all gamification collections.
// No uid prefix — personal-use app, single-user Firestore.

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './config';

const ref = (id) => doc(db, 'gamification', id);

// ── STATS ──────────────────────────────────────────────────
export const loadStats = async () => {
  try {
    const snap = await getDoc(ref('stats'));
    return snap.exists() ? snap.data() : { totalXP: 0, level: 1 };
  } catch { return { totalXP: 0, level: 1 }; }
};

export const saveStats = async (data) => {
  try { await setDoc(ref('stats'), data, { merge: true }); } catch {}
};

// ── STREAK ──────────────────────────────────────────────────
export const loadStreak = async () => {
  try {
    const snap = await getDoc(ref('streak'));
    return snap.exists() ? snap.data() : {
      currentStreak: 0, longestStreak: 0,
      lastLoggedDate: null, freezesAvailable: 2, lastFreezeReset: null,
    };
  } catch {
    return { currentStreak: 0, longestStreak: 0, lastLoggedDate: null, freezesAvailable: 2, lastFreezeReset: null };
  }
};

export const saveStreak = async (data) => {
  try { await setDoc(ref('streak'), data, { merge: true }); } catch {}
};

// ── BADGES ──────────────────────────────────────────────────
export const loadBadges = async () => {
  try {
    const snap = await getDoc(ref('badges'));
    return snap.exists() ? snap.data() : { earned: [] };
  } catch { return { earned: [] }; }
};

export const saveBadges = async (data) => {
  try { await setDoc(ref('badges'), data, { merge: false }); } catch {}
};

// ── WEEKLY CHALLENGE ─────────────────────────────────────────
export const loadWeeklyChallenge = async () => {
  try {
    const snap = await getDoc(ref('weeklyChallenge'));
    return snap.exists() ? snap.data() : null;
  } catch { return null; }
};

export const saveWeeklyChallenge = async (data) => {
  try { await setDoc(ref('weeklyChallenge'), data, { merge: false }); } catch {}
};

// ── MILESTONES ───────────────────────────────────────────────
export const loadMilestones = async () => {
  try {
    const snap = await getDoc(ref('milestones'));
    return snap.exists() ? snap.data() : { shown: [] };
  } catch { return { shown: [] }; }
};

export const saveMilestones = async (data) => {
  try { await setDoc(ref('milestones'), data, { merge: false }); } catch {}
};

// ── XP LOG ───────────────────────────────────────────────────
export const loadXPLog = async () => {
  try {
    const snap = await getDoc(ref('xpLog'));
    return snap.exists() ? snap.data() : { events: [] };
  } catch { return { events: [] }; }
};

export const appendXPEvent = async (event) => {
  try {
    const current = await loadXPLog();
    const events = [event, ...(current.events || [])].slice(0, 20);
    await setDoc(ref('xpLog'), { events });
  } catch {}
};
