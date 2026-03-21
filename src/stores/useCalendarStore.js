import { create } from 'zustand';
import {
  saveCalendarEvent,
  deleteCalendarEvent,
  loadCalendarEvents,
  batchCreateCalendarEventsAndDailyLogs,
  batchShiftCalendarEventsAndDailyLogs,
  batchDeleteCalendarEvents,
  cacheRead,
  todayISO,
} from '../firebase/firestore';
import { nanoid } from '../utils/nanoid';
import { addDaysToISO } from '../utils/dateUtils';

export const EVENT_TYPES = {
  study: { label: 'Study', color: '#4F8EF7', shiftable: true },
  revision: { label: 'Revision', color: '#A78BFA', shiftable: true },
  mock_test: { label: 'Mock Test', color: '#F59E0B', shiftable: false },
  subject_test: { label: 'Subject Test', color: '#EF4444', shiftable: true },
  pyq: { label: 'PYQ Day', color: '#EC4899', shiftable: true },
  sem_exam: { label: 'Sem Exam', color: '#374151', shiftable: false },
  leave: { label: 'Leave', color: '#6B7280', shiftable: false },
  buffer: { label: 'Buffer', color: '#CA8A04', shiftable: true },
};

export const useCalendarStore = create((set, get) => ({
  events: {},
  isLoaded: false,
  pendingShift: null,

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
      status: 'planned',
      ...eventData,
    };
    set((s) => ({ events: { ...s.events, [id]: event } }));
    await saveCalendarEvent(uid, id, event);
    return id;
  },

  updateEvent: async (uid, id, updates) => {
    const current = get().events[id];
    if (!current) return;
    const updated = { ...current, ...updates };
    set((s) => ({ events: { ...s.events, [id]: updated } }));
    await saveCalendarEvent(uid, id, updated);
  },

  upsertEvent: async (uid, id, eventData) => {
    const current = get().events[id] || {};
    const updated = {
      id,
      date: '',
      type: 'study',
      subjectId: null,
      label: '',
      color: EVENT_TYPES.study.color,
      done: false,
      notes: '',
      status: 'planned',
      ...current,
      ...eventData,
    };
    set((s) => ({ events: { ...s.events, [id]: updated } }));
    await saveCalendarEvent(uid, id, updated);
  },

  deleteEvent: async (uid, id) => {
    set((s) => {
      const { [id]: _removed, ...rest } = s.events;
      return { events: rest };
    });
    await deleteCalendarEvent(uid, id);
  },

  batchDeleteEventsForDate: async (uid, date) => {
    const toDelete = Object.values(get().events)
      .filter((event) => event.date === date)
      .map((event) => event.id);
    if (toDelete.length === 0) return;

    set((s) => {
      const remaining = {};
      Object.entries(s.events).forEach(([id, event]) => {
        if (event.date !== date) remaining[id] = event;
      });
      return { events: remaining };
    });

    await batchDeleteCalendarEvents(uid, toDelete);
  },

  markEventDone: async (uid, id) => {
    const event = get().events[id];
    if (!event) return { success: false };
    const today = todayISO();

    if (event.date < today) {
      return {
        success: false,
        reason: 'PAST_DATE',
        message: `This was planned for ${event.date}. That day has passed. It counts as missed - you can't go back and mark it done.\nWhat you can do: add a make-up event for today or a future date.`,
      };
    }

    await get().updateEvent(uid, id, { done: true, status: 'done', doneOn: today });
    return { success: true };
  },

  detectMissedEvents: () => {
    const today = todayISO();
    const events = Object.values(get().events);
    const missedTypes = new Set(['study', 'revision', 'pyq', 'subject_test']);
    const eventsByDate = events.reduce((acc, event) => {
      if (!acc[event.date]) acc[event.date] = [];
      acc[event.date].push(event);
      return acc;
    }, {});

    const missed = Object.values(eventsByDate).flatMap((dateEvents) => {
      const overrideType = dateEvents.find((event) => event.source === 'day_type')?.type || null;
      if (overrideType && !missedTypes.has(overrideType)) {
        return [];
      }

      return dateEvents.filter((event) =>
        event.source !== 'day_type' &&
        missedTypes.has(event.type) &&
        event.date < today &&
        event.status === 'planned' &&
        event.done === false
      );
    });

    if (missed.length > 0) {
      const updated = {};
      missed.forEach((event) => {
        updated[event.id] = { ...event, status: 'missed' };
      });
      set((s) => ({ events: { ...s.events, ...updated } }));

      const missedDates = [...new Set(missed.map((event) => event.date))].sort();
      set({ pendingShift: { missedDates, totalDays: missedDates.length } });
    } else {
      set({ pendingShift: null });
    }

    return missed;
  },

  dismissShift: () => set({ pendingShift: null }),

  cascadeShift: async (uid, gateExamDate, shiftFromDate, shiftDays) => {
    const events = get().events;
    const protectedTypes = new Set(['sem_exam', 'leave', 'mock_test']);
    const shiftableEvents = Object.values(events)
      .filter((event) => event.date >= shiftFromDate && !protectedTypes.has(event.type) && event.source !== 'day_type')
      .sort((a, b) => a.date.localeCompare(b.date));
    const shiftableEventsByDate = shiftableEvents.reduce((acc, event) => {
      if (!acc[event.date]) acc[event.date] = [];
      acc[event.date].push(event);
      return acc;
    }, {});
    const sourceDates = Object.keys(shiftableEventsByDate).sort();
    const protectedDates = new Set(
      Object.values(events)
        .filter((event) => protectedTypes.has(event.type))
        .map((event) => event.date)
    );

    const updates = [];
    const dateMoves = [];
    const warnings = [];
    const reservedDates = new Set(protectedDates);
    const addDays = (dateISO, n) => addDaysToISO(dateISO, n);

    const getNextAvailableDate = (targetDate) => {
      let date = targetDate;
      let attempts = 0;
      while ((protectedDates.has(date) || reservedDates.has(date)) && attempts < 365) {
        date = addDays(date, 1);
        attempts++;
      }
      return date;
    };

    for (const sourceDate of sourceDates) {
      const newDate = getNextAvailableDate(addDays(sourceDate, shiftDays));

      if (gateExamDate && newDate > gateExamDate) {
        warnings.push(`Study planned on ${sourceDate} could not be shifted because it would fall after your GATE exam date.`);
        continue;
      }

      reservedDates.add(newDate);
      dateMoves.push({ from: sourceDate, to: newDate });

      shiftableEventsByDate[sourceDate].forEach((event) => {
        updates.push({
          id: event.id,
          data: {
            ...event,
            date: newDate,
            status:
              newDate === event.date
                ? event.status
                : event.status === 'missed'
                  ? 'missed_and_shifted'
                  : 'shifted',
          },
        });
      });
    }

    if (updates.length > 0) {
      const updated = {};
      updates.forEach((update) => {
        updated[update.id] = { ...update.data };
      });
      const previous = {};
      updates.forEach((update) => {
        previous[update.id] = events[update.id];
      });
      set((s) => ({ events: { ...s.events, ...updated }, pendingShift: null }));
      try {
        await batchShiftCalendarEventsAndDailyLogs(uid, updates, dateMoves);
      } catch (error) {
        set((s) => ({ events: { ...s.events, ...previous } }));
        throw error;
      }
    } else {
      set({ pendingShift: null });
    }

    return { warnings, shiftedCount: updates.length };
  },

  getEventsForDate: (date) => {
    return Object.values(get().events).filter((event) => event.date === date);
  },

  getEventsForRange: (startDate, endDate) => {
    return Object.values(get().events)
      .filter((event) => event.date >= startDate && event.date <= endDate)
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  bulkAddEvents: async (uid, eventsArray) => {
    const updates = {};
    const eventsToCreate = eventsArray.map((eventData) => {
      const id = nanoid();
      const event = { id, done: false, status: 'planned', ...eventData };
      updates[id] = event;
      return event;
    });

    set((s) => ({ events: { ...s.events, ...updates } }));
    await batchCreateCalendarEventsAndDailyLogs(uid, eventsToCreate);
  },

  getDriftReport: (subjects, originalEndDates) => {
    if (!subjects || !originalEndDates) return [];
    return Object.values(subjects)
      .map((subject) => {
        const original = originalEndDates[subject.id];
        const current = subject.plannedEndDate;
        if (!original || !current) return null;
        const origDate = new Date(original);
        const currDate = new Date(current);
        const diffDays = Math.round((currDate - origDate) / (1000 * 60 * 60 * 24));
        return {
          subjectId: subject.id,
          name: subject.name,
          color: subject.color,
          driftDays: diffDays,
          original,
          current,
        };
      })
      .filter(Boolean);
  },
}));
