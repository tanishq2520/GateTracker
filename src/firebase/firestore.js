// src/firebase/firestore.js
// Firestore read/write helpers with localStorage cache + no-backdating enforcement

import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  onSnapshot, writeBatch, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db } from './config';
import { format } from 'date-fns';

// ── COLLECTION PATHS ──────────────────────────────────────────
export const userPath = (uid) => `users/${uid}`;
export const goalsRef = (uid) => doc(db, `users/${uid}/goals/main`);
export const subjectsRef = (uid) => collection(db, `users/${uid}/subjects`);
export const subjectDoc = (uid, id) => doc(db, `users/${uid}/subjects/${id}`);
export const calendarRef = (uid) => collection(db, `users/${uid}/calendarEvents`);
export const calendarEventDoc = (uid, id) => doc(db, `users/${uid}/calendarEvents/${id}`);
export const mockTestsRef = (uid) => collection(db, `users/${uid}/mockTests`);
export const mockTestDoc = (uid, id) => doc(db, `users/${uid}/mockTests/${id}`);
export const dailyLogsRef = (uid) => collection(db, `users/${uid}/dailyLogs`);
export const dailyLogDoc = (uid, date) => doc(db, `users/${uid}/dailyLogs/${date}`);
export const settingsRef = (uid) => doc(db, `users/${uid}/settings/preferences`);

// ── DATE UTILS ───────────────────────────────────────────────
export const todayISO = () => format(new Date(), 'yyyy-MM-dd');

const calcTaskTotals = (tasks = []) => ({
  totalPlannedHours: tasks.reduce((sum, task) => sum + (Number(task.estimatedHours) || 0), 0),
  totalCompletedHours: tasks
    .filter(task => task.done)
    .reduce((sum, task) => sum + (Number(task.estimatedHours) || 0), 0),
});

// !! NO-BACKDATING RULE — call before any "mark done" write !!
export const isAllowedToMarkDone = (plannedDateISO) => {
  if (!plannedDateISO) return true; // no date constraint
  const today = todayISO();
  return plannedDateISO >= today;
};

export const isPastDate = (dateISO) => dateISO < todayISO();
export const isTodayDate = (dateISO) => dateISO === todayISO();
export const isFutureOrToday = (dateISO) => dateISO >= todayISO();

// ── LOCALSTORAGE CACHE ────────────────────────────────────────
const CACHE_PREFIX = 'gate_tracker_';

export const cacheWrite = (key, data) => {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, ts: Date.now() }));
  } catch (e) {
    // Storage full or unavailable
  }
};

export const cacheRead = (key) => {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { data } = JSON.parse(raw);
    return data;
  } catch {
    return null;
  }
};

export const cacheClear = () => {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith(CACHE_PREFIX))
      .forEach(k => localStorage.removeItem(k));
  } catch {}
};

// ── GOALS ─────────────────────────────────────────────────────
export const saveGoals = async (uid, data) => {
  await setDoc(goalsRef(uid), data, { merge: true });
  cacheWrite(`goals_${uid}`, data);
};

export const loadGoals = async (uid) => {
  const snap = await getDoc(goalsRef(uid));
  const data = snap.exists() ? snap.data() : null;
  if (data) cacheWrite(`goals_${uid}`, data);
  return data;
};

// ── SUBJECTS ──────────────────────────────────────────────────
export const saveSubject = async (uid, id, data) => {
  await setDoc(subjectDoc(uid, id), data, { merge: true });
  cacheWrite(`subject_${uid}_${id}`, data);
};

export const deleteSubject = async (uid, id) => {
  await deleteDoc(subjectDoc(uid, id));
  localStorage.removeItem(CACHE_PREFIX + `subject_${uid}_${id}`);
};

export const loadSubjects = async (uid) => {
  const snap = await getDocs(subjectsRef(uid));
  const subjects = {};
  snap.forEach(d => { subjects[d.id] = { id: d.id, ...d.data() }; });
  cacheWrite(`subjects_${uid}`, subjects);
  return subjects;
};

// ── CALENDAR EVENTS ───────────────────────────────────────────
export const saveCalendarEvent = async (uid, id, data) => {
  await setDoc(calendarEventDoc(uid, id), data, { merge: true });
};

export const deleteCalendarEvent = async (uid, id) => {
  await deleteDoc(calendarEventDoc(uid, id));
};

export const loadCalendarEvents = async (uid) => {
  const snap = await getDocs(calendarRef(uid));
  const events = {};
  snap.forEach(d => { events[d.id] = { id: d.id, ...d.data() }; });
  cacheWrite(`calendar_${uid}`, events);
  return events;
};

export const batchCreateCalendarEventsAndDailyLogs = async (uid, eventsArray) => {
  if (!eventsArray || eventsArray.length === 0) return;

  const batch = writeBatch(db);
  const dates = [...new Set(eventsArray.map(event => event.date).filter(Boolean))];
  const existingLogEntries = await Promise.all(
    dates.map(async (date) => {
      const snap = await getDoc(dailyLogDoc(uid, date));
      return [date, snap.exists() ? snap.data() : null];
    })
  );
  const existingLogs = Object.fromEntries(existingLogEntries);
  const generatedTasksByDate = {};

  eventsArray.forEach((event) => {
    const { id, date, tasks = [], ...eventData } = event;
    batch.set(calendarEventDoc(uid, id), { id, date, tasks, ...eventData }, { merge: true });

    if (!generatedTasksByDate[date]) {
      generatedTasksByDate[date] = [];
    }

    generatedTasksByDate[date].push(
      ...tasks.map(task => ({
        id: task.id,
        description: task.description,
        subjectId: task.subjectId ?? event.subjectId ?? null,
        estimatedHours: Number(task.estimatedHours) || 0,
        done: Boolean(task.done),
        doneAt: task.doneAt ?? null,
      }))
    );
  });

  Object.entries(generatedTasksByDate).forEach(([date, generatedTasks]) => {
    const existingLog = existingLogs[date] || {};
    const mergedTasks = [...(existingLog.tasks || []), ...generatedTasks];
    const totals = calcTaskTotals(mergedTasks);

    batch.set(
      dailyLogDoc(uid, date),
      {
        date,
        tasks: mergedTasks,
        ...totals,
      },
      { merge: true }
    );
  });

  await batch.commit();
};

// Batch write calendar events (for cascade shift)
export const batchUpdateCalendarEvents = async (uid, updates) => {
  const batch = writeBatch(db);
  updates.forEach(({ id, data }) => {
    const ref = calendarEventDoc(uid, id);
    batch.set(ref, data, { merge: true });
  });
  await batch.commit();
};

export const batchShiftCalendarEventsAndDailyLogs = async (uid, eventUpdates, dateMoves) => {
  const batch = writeBatch(db);

  eventUpdates.forEach(({ id, data }) => {
    batch.set(calendarEventDoc(uid, id), data, { merge: true });
  });

  if (dateMoves?.length) {
    const relevantDates = [...new Set(dateMoves.flatMap(({ from, to }) => [from, to]))];
    const existingLogEntries = await Promise.all(
      relevantDates.map(async (date) => {
        const snap = await getDoc(dailyLogDoc(uid, date));
        return [date, snap.exists() ? snap.data() : null];
      })
    );
    const originalLogs = Object.fromEntries(existingLogEntries);
    const finalLogs = Object.fromEntries(
      relevantDates.map((date) => [date, originalLogs[date] ? { ...originalLogs[date] } : { date }])
    );

    dateMoves.forEach(({ from }) => {
      const sourceLog = finalLogs[from] || { date: from };
      finalLogs[from] = {
        ...sourceLog,
        date: from,
        tasks: [],
        totalPlannedHours: 0,
        totalCompletedHours: 0,
      };
    });

    dateMoves.forEach(({ from, to }) => {
      const movedTasks = originalLogs[from]?.tasks || [];
      if (movedTasks.length === 0) return;

      const targetLog = finalLogs[to] || { date: to, tasks: [] };
      const mergedTasks = [...(targetLog.tasks || []), ...movedTasks];

      finalLogs[to] = {
        ...targetLog,
        date: to,
        tasks: mergedTasks,
        ...calcTaskTotals(mergedTasks),
      };
    });

    Object.entries(finalLogs).forEach(([date, log]) => {
      batch.set(dailyLogDoc(uid, date), { ...log, date }, { merge: true });
    });
  }

  await batch.commit();
};

// Batch DELETE calendar events — chunks into groups of 500 (Firestore batch limit)
// and runs chunks in parallel so 700 deletes become ~2 parallel batch commits instead of 700 serial calls.
export const batchDeleteCalendarEvents = async (uid, ids) => {
  if (!ids || ids.length === 0) return;
  const CHUNK = 500;
  const chunks = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    chunks.push(ids.slice(i, i + CHUNK));
  }
  await Promise.all(chunks.map(chunk => {
    const batch = writeBatch(db);
    chunk.forEach(id => batch.delete(calendarEventDoc(uid, id)));
    return batch.commit();
  }));
};


// ── DAILY LOGS ────────────────────────────────────────────────
export const saveDailyLog = async (uid, date, data) => {
  // INTEGRITY: only allow writing for today
  if (date !== todayISO()) {
    throw new Error('NO_BACKDATING: Daily logs can only be written for today.');
  }
  await setDoc(dailyLogDoc(uid, date), { ...data, date }, { merge: true });
  cacheWrite(`log_${uid}_${date}`, data);
};

export const loadDailyLog = async (uid, date) => {
  const snap = await getDoc(dailyLogDoc(uid, date));
  return snap.exists() ? snap.data() : null;
};

export const loadDailyLogs = async (uid) => {
  const snap = await getDocs(dailyLogsRef(uid));
  const logs = {};
  snap.forEach(d => { logs[d.id] = { ...d.data() }; });
  cacheWrite(`logs_${uid}`, logs);
  return logs;
};

// ── MOCK TESTS ────────────────────────────────────────────────
export const saveMockTest = async (uid, id, data) => {
  await setDoc(mockTestDoc(uid, id), data, { merge: true });
};

export const deleteMockTest = async (uid, id) => {
  await deleteDoc(mockTestDoc(uid, id));
};

export const loadMockTests = async (uid) => {
  const snap = await getDocs(mockTestsRef(uid));
  const tests = {};
  snap.forEach(d => { tests[d.id] = { id: d.id, ...d.data() }; });
  cacheWrite(`mocktests_${uid}`, tests);
  return tests;
};

// ── SETTINGS ──────────────────────────────────────────────────
export const saveSettings = async (uid, data) => {
  await setDoc(settingsRef(uid), data, { merge: true });
  cacheWrite(`settings_${uid}`, data);
};

export const loadSettings = async (uid) => {
  const snap = await getDoc(settingsRef(uid));
  const data = snap.exists() ? snap.data() : null;
  if (data) cacheWrite(`settings_${uid}`, data);
  return data;
};

// ── EXPORT ALL DATA ───────────────────────────────────────────
export const exportAllData = async (uid) => {
  const [goals, subjects, events, tests, logs, settings] = await Promise.all([
    loadGoals(uid),
    loadSubjects(uid),
    loadCalendarEvents(uid),
    loadMockTests(uid),
    loadDailyLogs(uid),
    loadSettings(uid),
  ]);
  return { goals, subjects, calendarEvents: events, mockTests: tests, dailyLogs: logs, settings };
};
