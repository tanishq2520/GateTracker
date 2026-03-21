// src/stores/useCalendarStore.js
import { create } from 'zustand';
import {
  saveCalendarEvent, deleteCalendarEvent, loadCalendarEvents,
  batchUpdateCalendarEvents, batchDeleteCalendarEvents, cacheRead, todayISO, isFutureOrToday, isPastDate
} from '../firebase/firestore';
import { nanoid } from '../utils/nanoid';

export const EVENT_TYPES = {
  study: { label: 'Study', color: '#4F8EF7', shiftable: true },
  revision: { label: 'Revision', color: '#A78BFA', shiftable: true },
  mock_test: { label: 'Mock Test', color: '#F59E0B', shiftable: false },
  subject_test: { label: 'Subject Test', color: '#EF4444', shiftable: true },
  pyq: { label: 'PYQ Day', color: '#EF4444', shiftable: true },
  sem_exam: { label: 'Sem Exam', color: '#6B7280', shiftable: false },
  leave: { label: 'Leave', color: '#374151', shiftable: false },
  buffer: { label: 'Buffer', color: '#CA8A04', shiftable: true },
};

export const useCalendarStore = create((set, get) => ({
  events: {},   // { [id]: event }
  isLoaded: false,
  pendingShift: null,  // { missedDates: [], totalDays: N } — triggers banner

  loadEvents: async (uid) => {
    const cached = cacheRead(`calendar_${uid}`);
    if (cached) set({ events: cached, isLoaded: true });
    const data = await loadCalendarEvents(uid);
    set({ events: data || {}, isLoaded: true });
  },

  addEvent: async (uid, eventData) => {
    const id = nanoid();
    const event = {
      id,
      date: '',
      type: 'study',
      subjectId: null,
      label: '',
      color: '#4F8EF7',
      done: false,
      notes: '',
      status: 'planned',  // planned | done | missed | missed_and_shifted | shifted
      ...eventData,
    };
    set(s => ({ events: { ...s.events, [id]: event } }));
    await saveCalendarEvent(uid, id, event);
    return id;
  },

  updateEvent: async (uid, id, updates) => {
    const current = get().events[id];
    if (!current) return;
    const updated = { ...current, ...updates };
    set(s => ({ events: { ...s.events, [id]: updated } }));
    await saveCalendarEvent(uid, id, updated);
  },

  deleteEvent: async (uid, id) => {
    set(s => {
      const { [id]: _, ...rest } = s.events;
      return { events: rest };
    });
    await deleteCalendarEvent(uid, id);
  },

  // FAST: delete all events for a specific date in one batch (handles 700+ events)
  batchDeleteEventsForDate: async (uid, date) => {
    const toDelete = Object.values(get().events)
      .filter(e => e.date === date)
      .map(e => e.id);
    if (toDelete.length === 0) return;
    // Update local state immediately so UI responds instantly
    set(s => {
      const remaining = {};
      Object.entries(s.events).forEach(([id, ev]) => {
        if (ev.date !== date) remaining[id] = ev;
      });
      return { events: remaining };
    });
    // Then batch-delete from Firestore
    await batchDeleteCalendarEvents(uid, toDelete);
  },

  // NO-BACKDATING: mark event done — only for today or future
  markEventDone: async (uid, id) => {
    const event = get().events[id];
    if (!event) return { success: false };
    const today = todayISO();

    if (event.date < today) {
      return {
        success: false,
        reason: 'PAST_DATE',
        message: `This was planned for ${event.date}. That day has passed. It counts as missed — you can't go back and mark it done.\nWhat you can do: add a make-up event for today or a future date.`,
      };
    }

    await get().updateEvent(uid, id, { done: true, status: 'done', doneOn: today });
    return { success: true };
  },

  // Check past events for missed ones (called on app open)
  detectMissedEvents: (gateExamDate) => {
    const today = todayISO();
    const events = Object.values(get().events);
    const missed = events.filter(e =>
      e.date < today &&
      e.status === 'planned' &&
      e.done === false
    );
    if (missed.length > 0) {
      // Mark them as missed in local state
      const updated = {};
      missed.forEach(e => { updated[e.id] = { ...e, status: 'missed' }; });
      set(s => ({ events: { ...s.events, ...updated } }));

      // Group by date to find missed days
      const missedDates = [...new Set(missed.map(e => e.date))].sort();
      set({ pendingShift: { missedDates, totalDays: missedDates.length } });
    }
    return missed;
  },

  dismissShift: () => set({ pendingShift: null }),

  // CASCADE SHIFT ALGORITHM
  cascadeShift: async (uid, gateExamDate, shiftFromDate, shiftDays) => {
    const events = get().events;
    const today = todayISO();
    const protectedTypes = new Set(['sem_exam', 'leave', 'mock_test']);

    // Get all future events from shiftFromDate that are shiftable
    const toShift = Object.values(events)
      .filter(e => e.date >= shiftFromDate && !protectedTypes.has(e.type))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Get protected dates
    const protectedDates = new Set(
      Object.values(events)
        .filter(e => protectedTypes.has(e.type))
        .map(e => e.date)
    );

    const updates = [];
    const warnings = [];
    const usedBuffers = new Set();

    const addDays = (dateISO, n) => {
      const d = new Date(dateISO);
      d.setDate(d.getDate() + n);
      return d.toISOString().split('T')[0];
    };

    // Find next non-protected date at or after target
    const getNextAvailableDate = (targetDate) => {
      let d = targetDate;
      let attempts = 0;
      while (protectedDates.has(d) && attempts < 365) {
        d = addDays(d, 1);
        attempts++;
      }
      return d;
    };

    for (const event of toShift) {
      let newDate = getNextAvailableDate(addDays(event.date, shiftDays));

      // Stop if shifted past GATE exam date
      if (gateExamDate && newDate > gateExamDate) {
        warnings.push(`"${event.label || event.type}" (${event.date}) could not be shifted — it would fall after your GATE exam date.`);
        continue;
      }

      // Check if landing on a buffer day — consume it
      const isBuffer = event.type === 'buffer';
      const newStatus = event.status === 'missed' ? 'missed_and_shifted' : 'shifted';

      updates.push({
        id: event.id,
        data: {
          ...event,
          date: newDate,
          status: newDate === event.date ? event.status : 'shifted',
        }
      });
    }

    // Batch write to Firestore
    if (updates.length > 0) {
      await batchUpdateCalendarEvents(uid, updates);
      const updated = {};
      updates.forEach(u => { updated[u.id] = { ...u.data }; });
      set(s => ({ events: { ...s.events, ...updated }, pendingShift: null }));
    } else {
      set({ pendingShift: null });
    }

    return { warnings, shiftedCount: updates.length };
  },

  // Get events for a specific date
  getEventsForDate: (date) => {
    return Object.values(get().events).filter(e => e.date === date);
  },

  // Get events for date range
  getEventsForRange: (startDate, endDate) => {
    return Object.values(get().events)
      .filter(e => e.date >= startDate && e.date <= endDate)
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  // Bulk add events
  bulkAddEvents: async (uid, eventsArray) => {
    const updates = {};
    for (const eventData of eventsArray) {
      const id = nanoid();
      const event = { id, done: false, status: 'planned', ...eventData };
      updates[id] = event;
      await saveCalendarEvent(uid, id, event);
    }
    set(s => ({ events: { ...s.events, ...updates } }));
  },

  // Calculate drift per subject
  getDriftReport: (subjects, originalEndDates) => {
    if (!subjects || !originalEndDates) return [];
    return Object.values(subjects).map(s => {
      const original = originalEndDates[s.id];
      const current = s.plannedEndDate;
      if (!original || !current) return null;
      const origDate = new Date(original);
      const currDate = new Date(current);
      const diffDays = Math.round((currDate - origDate) / (1000 * 60 * 60 * 24));
      return { subjectId: s.id, name: s.name, color: s.color, driftDays: diffDays, original, current };
    }).filter(Boolean);
  },
}));
