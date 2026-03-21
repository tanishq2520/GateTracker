// src/utils/dateUtils.js — date helper functions
import { format, parseISO, differenceInDays, addDays, isToday, isPast, isFuture } from 'date-fns';

export const formatDate = (dateISO, fmt = 'MMM d, yyyy') => {
  if (!dateISO) return '—';
  try { return format(parseISO(dateISO), fmt); } catch { return dateISO; }
};

export const formatDay = (dateISO) => formatDate(dateISO, 'EEE, MMM d');
export const formatShort = (dateISO) => formatDate(dateISO, 'MMM d');
export const formatFull = (dateISO) => formatDate(dateISO, 'EEEE, MMMM d');
export const formatMonthYear = (dateISO) => formatDate(dateISO, 'MMMM yyyy');
export const formatMonth = (year, month) => format(new Date(year, month, 1), 'MMMM yyyy');

export const toISODateString = (value) => {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return format(date, 'yyyy-MM-dd');
};

export const todayISO = () => format(new Date(), 'yyyy-MM-dd');
export const tomorrowISO = () => format(addDays(new Date(), 1), 'yyyy-MM-dd');

export const daysUntil = (dateISO) => {
  if (!dateISO) return null;
  return differenceInDays(parseISO(dateISO), new Date());
};

export const daysSince = (dateISO) => {
  if (!dateISO) return null;
  return differenceInDays(new Date(), parseISO(dateISO));
};

export const addDaysToISO = (dateISO, n) => format(addDays(parseISO(dateISO), n), 'yyyy-MM-dd');

export const isTodayISO = (dateISO) => dateISO === todayISO();
export const isPastISO = (dateISO) => dateISO < todayISO();
export const isFutureISO = (dateISO) => dateISO > todayISO();
export const isFutureOrTodayISO = (dateISO) => dateISO >= todayISO();

export const getDaysInMonth = (year, month) => {
  const days = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(toISODateString(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

export const getMonthRange = (year, month) => {
  const firstDay = new Date(year, month, 1);
  const startPad = firstDay.getDay(); // 0=Sun
  const days = [];
  // Pad with prev month days
  for (let i = startPad; i > 0; i--) {
    const d = new Date(year, month, 1 - i);
    days.push({ date: toISODateString(d), inMonth: false });
  }
  // Current month days
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = toISODateString(new Date(year, month, d));
    days.push({ date: dateStr, inMonth: true });
  }
  // Pad end to complete 6 rows
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i);
    days.push({ date: toISODateString(d), inMonth: false });
  }
  return days;
};

export const estimateEndDate = (startDateISO, totalLectures, lecturesPerDay) => {
  if (!startDateISO || !lecturesPerDay || lecturesPerDay === 0) return null;
  const days = Math.ceil(totalLectures / lecturesPerDay);
  return addDaysToISO(startDateISO, days);
};

export const getDatesBetween = (startISO, endISO, daysOfWeek = null) => {
  if (!startISO || !endISO) return [];

  // Parse as LOCAL time (append T00:00:00 to prevent UTC midnight timezone shift)
  const start = new Date(startISO + 'T00:00:00');
  const end   = new Date(endISO   + 'T00:00:00');

  if (isNaN(start) || isNaN(end) || start > end) return [];

  const dates   = [];
  const current = new Date(start); // mutable copy — never the external reference

  while (current <= end) {
    const dayOfWeek = current.getDay(); // 0=Sun … 6=Sat
    if (!daysOfWeek || daysOfWeek.includes(dayOfWeek)) {
      // Always push a fresh string copy, never the mutable Date reference
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
    }
    current.setDate(current.getDate() + 1); // mutate in place — safe because we snapshot above
  }

  return dates;
};
