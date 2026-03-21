// src/firebase/gamification.js
// Firestore read/write helpers for per-user gamification collections.

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './config';

const ref = (uid, id) => doc(db, `users/${uid}/gamification/${id}`);

const defaultStats = { totalXP: 0, level: 1 };
const defaultStreak = {
  currentStreak: 0,
  longestStreak: 0,
  lastLoggedDate: null,
  freezesAvailable: 2,
  lastFreezeReset: null,
};
const defaultBadges = { earned: [] };
const defaultMilestones = { shown: [] };
const defaultXPLog = { events: [] };

export const loadStats = async (uid) => {
  if (!uid) return defaultStats;
  try {
    const snap = await getDoc(ref(uid, 'stats'));
    return snap.exists() ? snap.data() : defaultStats;
  } catch {
    return defaultStats;
  }
};

export const saveStats = async (uid, data) => {
  if (!uid) return;
  try {
    await setDoc(ref(uid, 'stats'), data, { merge: true });
  } catch {}
};

export const loadStreak = async (uid) => {
  if (!uid) return defaultStreak;
  try {
    const snap = await getDoc(ref(uid, 'streak'));
    return snap.exists() ? snap.data() : defaultStreak;
  } catch {
    return defaultStreak;
  }
};

export const saveStreak = async (uid, data) => {
  if (!uid) return;
  try {
    await setDoc(ref(uid, 'streak'), data, { merge: true });
  } catch {}
};

export const loadBadges = async (uid) => {
  if (!uid) return defaultBadges;
  try {
    const snap = await getDoc(ref(uid, 'badges'));
    return snap.exists() ? snap.data() : defaultBadges;
  } catch {
    return defaultBadges;
  }
};

export const saveBadges = async (uid, data) => {
  if (!uid) return;
  try {
    await setDoc(ref(uid, 'badges'), data, { merge: false });
  } catch {}
};

export const loadWeeklyChallenge = async (uid) => {
  if (!uid) return null;
  try {
    const snap = await getDoc(ref(uid, 'weeklyChallenge'));
    return snap.exists() ? snap.data() : null;
  } catch {
    return null;
  }
};

export const saveWeeklyChallenge = async (uid, data) => {
  if (!uid) return;
  try {
    await setDoc(ref(uid, 'weeklyChallenge'), data, { merge: false });
  } catch {}
};

export const loadMilestones = async (uid) => {
  if (!uid) return defaultMilestones;
  try {
    const snap = await getDoc(ref(uid, 'milestones'));
    return snap.exists() ? snap.data() : defaultMilestones;
  } catch {
    return defaultMilestones;
  }
};

export const saveMilestones = async (uid, data) => {
  if (!uid) return;
  try {
    await setDoc(ref(uid, 'milestones'), data, { merge: false });
  } catch {}
};

export const loadXPLog = async (uid) => {
  if (!uid) return defaultXPLog;
  try {
    const snap = await getDoc(ref(uid, 'xpLog'));
    return snap.exists() ? snap.data() : defaultXPLog;
  } catch {
    return defaultXPLog;
  }
};

export const appendXPEvent = async (uid, event) => {
  if (!uid) return;
  try {
    const current = await loadXPLog(uid);
    const events = [event, ...(current.events || [])].slice(0, 20);
    await setDoc(ref(uid, 'xpLog'), { events });
  } catch {}
};
