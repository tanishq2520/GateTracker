// src/pages/CalendarPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { useAuthStore } from '../stores/useAuthStore';
import { useCalendarStore, EVENT_TYPES } from '../stores/useCalendarStore';
import { useDailyLogStore } from '../stores/useDailyLogStore';
import { useSubjectsStore } from '../stores/useSubjectsStore';
import { useGoalsStore } from '../stores/useGoalsStore';
import { useUIStore } from '../stores/useUIStore';
import { getMonthRange, formatMonthYear, todayISO, getDatesBetween, toISODateString } from '../utils/dateUtils';
import { calendarRef, dailyLogsRef } from '../firebase/firestore';
import EventModal from '../components/calendar/EventModal';
import LogTodayModal from '../components/calendar/LogTodayModal';
import DayDetailPanel from '../components/calendar/DayDetailPanel';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const formatDayTypeLabel = (dayType) =>
  dayType
    ? dayType
        .split('_')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    : null;

export default function CalendarPage() {
  const today = todayISO();
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [fullJourney, setFullJourney] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalMode, setModalMode] = useState(null); // 'add' | 'view' | 'log' | 'edit'
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Bulk add state
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState({ subjectId: '', startDate: '', endDate: '', days: [1,2,3,4,5], tasks: [] });
  const [bulkNewTask, setBulkNewTask] = useState({ description: '', estimatedHours: '' });
  const [bulkPreview, setBulkPreview] = useState(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [liveEvents, setLiveEvents] = useState(null);
  const [liveDailyLogs, setLiveDailyLogs] = useState(null);

  const { uid } = useAuthStore();
  const events = useCalendarStore(s => s.events);
  const dailyLogs = useDailyLogStore(s => s.logs);
  const subjects = useSubjectsStore(s => s.subjects);
  const goals = useGoalsStore(s => s.goals);
  const showToast = useUIStore(s => s.showToast);
  const bulkAddEvents = useCalendarStore(s => s.bulkAddEvents);

  const gateDate = goals.gateExamDate;
  const calendarEvents = useMemo(
    () => ({ ...(liveEvents ?? {}), ...events }),
    [liveEvents, events]
  );
  const dailyLogsByDate = useMemo(
    () => ({ ...(liveDailyLogs ?? {}), ...dailyLogs }),
    [liveDailyLogs, dailyLogs]
  );

  useEffect(() => {
    if (!uid) return undefined;

    const unsubscribeEvents = onSnapshot(calendarRef(uid), (snapshot) => {
      const nextEvents = {};
      snapshot.forEach((docSnap) => {
        nextEvents[docSnap.id] = { id: docSnap.id, ...docSnap.data() };
      });
      setLiveEvents(nextEvents);
    });

    const unsubscribeLogs = onSnapshot(dailyLogsRef(uid), (snapshot) => {
      const nextLogs = {};
      snapshot.forEach((docSnap) => {
        nextLogs[docSnap.id] = docSnap.data();
      });
      setLiveDailyLogs(nextLogs);
    });

    return () => {
      unsubscribeEvents();
      unsubscribeLogs();
    };
  }, [uid]);

  const prevMonth = () => setViewDate(v => {
    const d = new Date(v.year, v.month - 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const nextMonth = () => setViewDate(v => {
    const d = new Date(v.year, v.month + 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const jumpToGate = () => {
    if (gateDate) {
      const d = new Date(`${gateDate}T00:00:00`);
      setViewDate({ year: d.getFullYear(), month: d.getMonth() });
    }
  };

  const getEventsForDate = (date) => Object.values(calendarEvents).filter(e => e.date === date);
  const getVisibleEventsForDate = (date) => getEventsForDate(date).filter(event => event.source !== 'day_type');
  const getTasksForDate = (date) => dailyLogsByDate[date]?.tasks || [];
  const getExplicitDayTypeForDate = (date) => dailyLogsByDate[date]?.dayType
    || getEventsForDate(date).find(event => event.source === 'day_type')?.type
    || null;
  const getCellLabel = (date) => {
    // Always prefer live dailyLogs task data — calendarEvents labels can be stale
    const tasks = getTasksForDate(date);
    if (tasks.length > 0) {
      const subjectNames = [...new Set(
        tasks
          .map(task => task.subjectId)
          .filter(Boolean)
          .map((subjectId) => subjects[subjectId]?.name || subjectId)
      )];
      if (subjectNames.length === 1) return subjectNames[0];
      if (subjectNames.length === 2) return subjectNames.join(' + ');
      if (subjectNames.length > 2) return `${subjectNames[0]} +${subjectNames.length - 1} more`;
      return tasks[0]?.description || 'Study';
    }

    // No tasks in dailyLogs — fall back to calendarEvent label (e.g. manually created events)
    const primaryEvent = getVisibleEventsForDate(date)[0];
    if (primaryEvent?.label) return primaryEvent.label;

    return formatDayTypeLabel(getExplicitDayTypeForDate(date));
  };
  const getLogColor = (date) => {
    const tasks = getTasksForDate(date);
    const explicitDayType = getExplicitDayTypeForDate(date);
    if (explicitDayType && explicitDayType !== 'study') {
      return EVENT_TYPES[explicitDayType]?.color || EVENT_TYPES.study.color;
    }
    return subjects[tasks[0]?.subjectId]?.color || EVENT_TYPES.study.color;
  };
  const calendarDisplayMap = useMemo(() => {
    const displayMap = {};

    Object.values(calendarEvents)
      .filter(event => event.source !== 'day_type')
      .forEach((event) => {
        if (displayMap[event.date]) return;
        displayMap[event.date] = {
          type: event.type,
          label: event.label || null,
          color: event.color || EVENT_TYPES[event.type]?.color || EVENT_TYPES.study.color,
          status: event.status || 'planned',
          source: 'event',
        };
      });

    Object.entries(dailyLogsByDate).forEach(([date, log]) => {
      const hasTasks = (log.tasks || []).length > 0;
      const explicitDayType = getExplicitDayTypeForDate(date);
      if (!displayMap[date] && (hasTasks || explicitDayType)) {
        displayMap[date] = {
          type: explicitDayType || 'study',
          label: null,
          color: getLogColor(date),
          status: 'planned',
          source: 'log',
        };
      }
      if (displayMap[date] && hasTasks) {
        // Tasks exist — always recalculate label from live data (overrides stale calendarEvent label)
        displayMap[date].label = getCellLabel(date);
        displayMap[date].color = getLogColor(date);
      } else if (displayMap[date] && !displayMap[date].label) {
        displayMap[date].label = getCellLabel(date);
      }
      if (displayMap[date] && displayMap[date].source === 'log') {
        displayMap[date].color = getLogColor(date);
      }
    });

    Object.keys(displayMap).forEach((date) => {
      if (!displayMap[date].label) {
        displayMap[date].label = getCellLabel(date);
      }
    });

    return displayMap;
  }, [calendarEvents, dailyLogsByDate, subjects]);
  const getDisplayPillStyle = (entry) => {
    const isDone = entry?.status === 'done';
    const isMissed = entry?.status === 'missed' || entry?.status === 'missed_and_shifted';
    return {
      background: isDone ? '#22C55E22' : isMissed ? '#EF444422' : `${entry.color}22`,
      color: isDone ? '#22C55E' : isMissed ? '#EF4444' : entry.color,
    };
  };

  // Any date click — open the Day Detail Panel
  const handleDayClick = (date, inMonth) => {
    if (!inMonth) return;
    setSelectedDate(toISODateString(date));
    setModalMode('day-panel');
  };

  // Returns true if a date is blocked by sem_exam
  const isSemExamDate = (dateStr) => {
    return getExplicitDayTypeForDate(dateStr) === 'sem_exam';
  };

  // Bulk add logic
  const handleBulkPreview = () => {
    const { subjectId, startDate, endDate, days, tasks } = bulkForm;
    if (!subjectId || !startDate || !endDate) {
      showToast('Please select subject, start date, and end date.', 'error');
      return;
    }
    const allDates = getDatesBetween(startDate, endDate, days);
    if (allDates.length === 0) {
      showToast('No valid days found in this range for the selected weekdays.', 'error');
      return;
    }
    // Filter out dates blocked by sem_exam
    const dates = allDates.filter(d => !isSemExamDate(toISODateString(d)));
    const skipped = allDates.length - dates.length;
    if (dates.length === 0) {
      showToast('All dates in this range are blocked by Sem Exam days.', 'error');
      return;
    }
    const subject = subjects[subjectId];
    const totalDailyHours = tasks.reduce((s, t) => s + t.estimatedHours, 0);
    setBulkPreview({ dates, count: dates.length, skipped, subject, tasks, totalDailyHours });
  };

  const handleBulkGenerate = async () => {
    if (!bulkPreview) return;
    setBulkSaving(true);
    try {
      const { subjectId } = bulkForm;
      const subject = subjects[subjectId];
      // Attach the tasks array to the calendar event, skip sem_exam dates
      const eventsToAdd = bulkPreview.dates
        .filter(date => !isSemExamDate(toISODateString(date)))
        .map(date => ({
          date: toISODateString(date),
          type: 'study',
          subjectId,
          label: subject?.name || '',
          color: subject?.color || '#4F8EF7',
          done: false,
          status: 'planned',
          tasks: (bulkPreview.tasks || []).map(task => ({
            id: crypto.randomUUID(),
            description: task.description,
            subjectId,
            estimatedHours: Number(task.estimatedHours) || 0,
            done: false,
            doneAt: null,
          })),
        }));
      await bulkAddEvents(uid, eventsToAdd);
      const skippedMsg = bulkPreview.skipped > 0 ? ` (${bulkPreview.skipped} sem exam day${bulkPreview.skipped > 1 ? 's' : ''} skipped)` : '';
      showToast(`Added ${eventsToAdd.length} study days for ${subject?.name}${skippedMsg}.`, 'success');
      setBulkOpen(false);
      setBulkPreview(null);
      setBulkForm({ subjectId: '', startDate: '', endDate: '', days: [1,2,3,4,5], tasks: [] });
      setBulkNewTask({ description: '', estimatedHours: '' });
    } catch (error) {
      console.error('Quick Fill failed', error);
      showToast('Quick Fill failed. Please try again.', 'error');
    } finally {
      setBulkSaving(false);
    }
  };

  // Build months for full journey view
  const journeyMonths = useMemo(() => {
    if (!fullJourney) return [];
    const months = [];
    const start = new Date();
    const end = gateDate ? new Date(gateDate) : new Date(start.getFullYear(), start.getMonth() + 6, 1);
    let cur = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cur <= end) {
      months.push({ year: cur.getFullYear(), month: cur.getMonth() });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
    return months;
  }, [fullJourney, gateDate]);

  const renderCalendarGrid = (year, month, compact = false) => {
    const days = getMonthRange(year, month);
    return (
      <div>
        <div className={`grid grid-cols-7 ${compact ? 'gap-0.5' : 'gap-1'} mb-1`}>
          {DAY_NAMES.map(d => (
            <div key={d} className={`text-center text-text-muted font-mono ${compact ? 'text-[9px]' : 'text-xs'}`}>{compact ? d[0] : d}</div>
          ))}
        </div>
      <div className={`grid grid-cols-7 ${compact ? 'gap-0.5' : 'gap-1'}`}>
          {days.map(({ date, inMonth }) => {
            const displayEntry = calendarDisplayMap[date] || null;
            const isToday = date === today;
            const isPast = date < today;
            const isGate = date === gateDate;
            return (
              <div
                key={date}
                onClick={() => !compact && handleDayClick(date, inMonth)}
                className={`
                  ${compact ? 'h-8 text-[9px]' : 'min-h-[70px] text-xs p-1 cursor-pointer'}
                  relative rounded flex flex-col
                  ${!inMonth ? 'opacity-20' : ''}
                  ${isToday ? 'ring-1 ring-accent-blue' : ''}
                  ${isGate ? 'ring-1 ring-accent-red' : ''}
                `}
                style={{
                  background: !compact ? 'rgba(255,255,255,0.03)' : undefined,
                  border: !compact ? '1px solid rgba(255,255,255,0.06)' : undefined,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (inMonth && !compact) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={e => { if (!compact) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: compact ? 9 : 11, color: isToday ? '#F97316' : isPast && inMonth ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.8)', fontWeight: isToday ? 700 : 400, ...(compact ? { margin: '4px auto 0' } : { marginBottom: 2 }) }}>
                  {new Date(`${date}T00:00:00`).getDate()}
                </span>
                {displayEntry?.label && !compact && (
                  <div
                    className={`rounded px-1 py-0.5 text-[10px] truncate mb-0.5 ${displayEntry.status === 'shifted' ? 'ring-1 ring-orange-400' : ''}`}
                    style={getDisplayPillStyle(displayEntry)}
                  >
                    {displayEntry.label}
                  </div>
                )}
                {displayEntry?.label && compact && (
                  <div
                    className="mt-auto mx-0.5 mb-0.5 rounded px-1 py-[1px] text-[7px] truncate leading-none"
                    style={getDisplayPillStyle(displayEntry)}
                  >
                    {displayEntry.label}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'rgba(255,255,255,0.9)', letterSpacing: '-0.02em', margin: 0 }}>Calendar</h1>
        <div className="flex items-center gap-2">
          {gateDate && (
            <button onClick={jumpToGate} className="btn-secondary text-xs">Jump to GATE date</button>
          )}
          <button
            onClick={() => setFullJourney(!fullJourney)}
            className="btn-secondary text-xs"
          >
            {fullJourney ? 'Month View' : 'Full Journey View'}
          </button>
        </div>
      </div>

      {!fullJourney ? (
        /* Month view */
        <div className="liquid-glass" style={{ borderRadius: 16, padding: '18px 20px' }}>
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="text-text-muted hover:text-text-primary p-1" style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h2 style={{ color: 'rgba(255,255,255,0.9)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500 }}>
              {formatMonthYear(`${viewDate.year}-${String(viewDate.month + 1).padStart(2, '0')}-01`)}
            </h2>
            <button onClick={nextMonth} className="text-text-muted hover:text-text-primary p-1" style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
          {renderCalendarGrid(viewDate.year, viewDate.month)}
        </div>
      ) : (
        /* Full Journey View */
        <div className="space-y-4">
          {journeyMonths.map(({ year, month }) => (
            <div key={`${year}-${month}`} className="liquid-glass" style={{ borderRadius: 16, padding: '18px 20px' }}>
              <h3 style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
                {formatMonthYear(`${year}-${String(month + 1).padStart(2, '0')}-01`)}
              </h3>
              {renderCalendarGrid(year, month, true)}
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="liquid-glass mt-4" style={{ borderRadius: 16, padding: '18px 20px' }}>
        <div className="flex flex-wrap gap-4 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {Object.entries(EVENT_TYPES).map(([key, { label, color }]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span>{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: '#34D399' }} /><span>Done</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: '#F87171' }} /><span>Missed</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: '#F97316' }} /><span>Shifted</span></div>
        </div>
      </div>

      {/* Bulk Add Helper */}
      <div className="liquid-glass mt-4" style={{ borderRadius: 16, padding: '18px 20px' }}>
        <button onClick={() => setBulkOpen(!bulkOpen)} className="flex items-center gap-2 text-sm font-medium text-text-primary w-full">
          <svg className={`w-4 h-4 text-text-muted transition-transform ${bulkOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          Quick Fill Study Days
        </button>
        {bulkOpen && (
          <div className="mt-4 space-y-4">
            <p className="text-text-muted text-xs">Bulk-add study events for a subject across a date range.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Subject</label>
                <select value={bulkForm.subjectId} onChange={e => setBulkForm(f => ({ ...f, subjectId: e.target.value }))} className="input">
                  <option value="">Select subject...</option>
                  {Object.values(subjects).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div />
              <div>
                <label className="label">Start Date</label>
                <input type="date" value={bulkForm.startDate} onChange={e => setBulkForm(f => ({ ...f, startDate: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="label">End Date</label>
                <input type="date" value={bulkForm.endDate} onChange={e => setBulkForm(f => ({ ...f, endDate: e.target.value }))} className="input" />
              </div>
            </div>
            {/* Days of week */}
            <div>
              <label className="label">Days of Week to Include</label>
              <div className="flex gap-2 flex-wrap">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => (
                  <button
                    key={i}
                    onClick={() => setBulkForm(f => ({
                      ...f,
                      days: f.days.includes(i) ? f.days.filter(x => x !== i) : [...f.days, i]
                    }))}
                    style={{
                      padding: '4px 10px', borderRadius: 4, fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer', transition: 'all 0.15s',
                      background: bulkForm.days.includes(i) ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${bulkForm.days.includes(i) ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.12)'}`,
                      color: bulkForm.days.includes(i) ? '#F97316' : 'rgba(255,255,255,0.55)',
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            {/* Tasks Builder */}
            <div>
              <label className="label mb-2">Tasks to assign each day</label>
              <div className="space-y-2 mb-3">
                {bulkForm.tasks.map((t, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                    <span style={{ flex: 1, color: 'rgba(255,255,255,0.85)' }}>{t.description}</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>{t.estimatedHours}h</span>
                    <button 
                      onClick={() => setBulkForm(f => ({ ...f, tasks: f.tasks.filter((_, i) => i !== idx) }))}
                      style={{ color: '#F87171', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Task (e.g. 2 lectures DBMS)" 
                  value={bulkNewTask.description}
                  onChange={e => setBulkNewTask(t => ({ ...t, description: e.target.value }))}
                  className="input flex-1"
                />
                <input 
                  type="number" 
                  step="0.5" 
                  placeholder="Hrs" 
                  value={bulkNewTask.estimatedHours}
                  onChange={e => setBulkNewTask(t => ({ ...t, estimatedHours: e.target.value }))}
                  className="input w-20 text-center"
                />
                <button 
                  onClick={() => {
                    if(!bulkNewTask.description || !bulkNewTask.estimatedHours) return;
                    setBulkForm(f => ({ 
                      ...f, 
                      tasks: [...f.tasks, { description: bulkNewTask.description, estimatedHours: parseFloat(bulkNewTask.estimatedHours)||0 }] 
                    }));
                    setBulkNewTask({ description: '', estimatedHours: '' });
                  }}
                  className="btn-secondary whitespace-nowrap"
                  disabled={!bulkNewTask.description || !bulkNewTask.estimatedHours}
                >
                  + Add Task
                </button>
              </div>
              {bulkForm.tasks.length > 0 && (
                <div className="mt-2 text-[10px] text-text-muted font-mono text-right">
                  Total per day: {bulkForm.tasks.reduce((s,t) => s + t.estimatedHours, 0)} hrs
                </div>
              )}
            </div>

            {bulkPreview && (
              <div className="bg-accent-blue/5 border border-accent-blue/20 rounded-md px-3 py-2">
                <p className="text-accent-blue text-sm font-mono leading-relaxed">
                  This will generate <strong>{bulkPreview.count}</strong> study days for {bulkPreview.subject?.name}.<br/>
                  Each day will have <strong>{bulkPreview.tasks.length}</strong> tasks ({bulkPreview.totalDailyHours} hrs/day).
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={handleBulkPreview} className="btn-secondary text-sm">Preview</button>
              <button onClick={handleBulkGenerate} disabled={!bulkPreview || bulkSaving} className="btn-primary text-sm">
                {bulkSaving ? 'Generating...' : 'Generate Events'}
              </button>
            </div>
          </div>
        )}
      </div>

      {(modalMode === 'add' || modalMode === 'edit-event') && (
        <EventModal
          date={selectedDate}
          event={modalMode === 'edit-event' ? selectedEvent : null}
          mode={modalMode}
          onClose={() => { setModalMode(null); setSelectedDate(null); setSelectedEvent(null); }}
        />
      )}
      {modalMode === 'view-event' && selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="liquid-glass max-w-sm w-full" style={{ borderRadius: 16, padding: "18px 20px" }}>
            <h3 className="text-sm font-mono font-medium text-text-primary mb-3">Past Event</h3>
            <div className="space-y-2 text-sm">
              <div><span className="text-text-muted">Date: </span><span className="text-text-primary">{selectedEvent.date}</span></div>
              <div><span className="text-text-muted">Type: </span><span className="text-text-primary">{selectedEvent.type}</span></div>
              <div><span className="text-text-muted">Label: </span><span className="text-text-primary">{selectedEvent.label}</span></div>
              <div><span className="text-text-muted">Status: </span><span className={`font-mono ${selectedEvent.status === 'done' ? 'text-accent-green' : 'text-accent-red'}`}>{selectedEvent.status}</span></div>
            </div>
            <p className="text-text-muted text-xs mt-3">Past events cannot be edited.</p>
            <button onClick={() => { setModalMode(null); setSelectedEvent(null); }} className="btn-secondary w-full mt-3 text-sm">Close</button>
          </div>
        </div>
      )}
      {modalMode === 'day-panel' && selectedDate && (
        <DayDetailPanel
          date={selectedDate}
          onClose={() => { setModalMode(null); setSelectedDate(null); }}
        />
      )}
      {modalMode === 'log' && (
        <LogTodayModal onClose={() => { setModalMode(null); setSelectedDate(null); }} />
      )}
    </div>
  );
}
