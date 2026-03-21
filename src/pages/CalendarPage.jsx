// src/pages/CalendarPage.jsx
import React, { useState, useMemo } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useCalendarStore, EVENT_TYPES } from '../stores/useCalendarStore';
import { useSubjectsStore } from '../stores/useSubjectsStore';
import { useGoalsStore } from '../stores/useGoalsStore';
import { useUIStore } from '../stores/useUIStore';
import { getMonthRange, formatMonthYear, todayISO, isFutureOrTodayISO, isPastISO, isTodayISO, getDatesBetween } from '../utils/dateUtils';
import EventModal from '../components/calendar/EventModal';
import LogTodayModal from '../components/calendar/LogTodayModal';
import DayDetailPanel from '../components/calendar/DayDetailPanel';

const STATUS_COLORS = {
  planned: '',
  done: '#22C55E',
  missed: '#EF4444',
  missed_and_shifted: '#EF4444',
  shifted: '#FB923C',
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

  const { uid } = useAuthStore();
  const events = useCalendarStore(s => s.events);
  const subjects = useSubjectsStore(s => s.subjects);
  const goals = useGoalsStore(s => s.goals);
  const showToast = useUIStore(s => s.showToast);
  const addEvent = useCalendarStore(s => s.addEvent);
  const bulkAddEvents = useCalendarStore(s => s.bulkAddEvents);
  const markEventDone = useCalendarStore(s => s.markEventDone);

  const gateDate = goals.gateExamDate;

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
      const d = new Date(gateDate);
      setViewDate({ year: d.getFullYear(), month: d.getMonth() });
    }
  };

  const calDays = useMemo(() => getMonthRange(viewDate.year, viewDate.month), [viewDate.year, viewDate.month]);

  const getEventsForDate = (date) => Object.values(events).filter(e => e.date === date);

  // Any date click — open the Day Detail Panel
  const handleDayClick = (date, inMonth) => {
    if (!inMonth) return;
    setSelectedDate(date);
    setModalMode('day-panel');
  };

  const handleEventClick = (e, event) => {
    e.stopPropagation();
    // Open DayDetailPanel for the event's date
    setSelectedDate(event.date);
    setModalMode('day-panel');
  };

  // Bulk add logic
  const handleBulkPreview = () => {
    const { subjectId, startDate, endDate, days, tasks } = bulkForm;
    if (!subjectId || !startDate || !endDate) {
      showToast('Please select subject, start date, and end date.', 'error');
      return;
    }
    const dates = getDatesBetween(startDate, endDate, days);
    if (dates.length === 0) {
      showToast('No valid days found in this range for the selected weekdays.', 'error');
      return;
    }
    const subject = subjects[subjectId];
    const totalDailyHours = tasks.reduce((s, t) => s + t.estimatedHours, 0);
    setBulkPreview({ dates, count: dates.length, subject, tasks, totalDailyHours });
  };

  const handleBulkGenerate = async () => {
    if (!bulkPreview) return;
    setBulkSaving(true);
    const { subjectId } = bulkForm;
    const subject = subjects[subjectId];
    // Attach the tasks array to the calendar event
    const eventsToAdd = bulkPreview.dates.map(date => ({
      date, type: 'study', subjectId,
      label: subject?.name || '',
      color: subject?.color || '#4F8EF7',
      done: false, status: 'planned',
      tasks: (bulkPreview.tasks || []).map(t => ({ ...t, id: Math.random().toString(36).substring(2,9) }))
    }));
    await bulkAddEvents(uid, eventsToAdd);
    showToast(`Added ${eventsToAdd.length} study days for ${subject?.name}.`, 'success');
    setBulkOpen(false);
    setBulkPreview(null);
    setBulkForm({ subjectId: '', startDate: '', endDate: '', days: [1,2,3,4,5], tasks: [] });
    setBulkNewTask({ description: '', estimatedHours: '' });
    setBulkSaving(false);
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
            const dayEvents = getEventsForDate(date);
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
                  ${inMonth ? 'hover:bg-surface transition-colors' : ''}
                  ${!compact ? 'bg-bg/50 border border-border/30' : ''}
                `}
              >
                <span className={`${compact ? 'mx-auto mt-1' : 'mb-0.5'} font-mono ${isToday ? 'text-accent-blue font-bold' : isPast && inMonth ? 'text-text-muted' : 'text-text-primary'}`}>
                  {new Date(date).getDate()}
                </span>
                {!compact && dayEvents.slice(0, 2).map(ev => (
                  <div
                    key={ev.id}
                    onClick={e => handleEventClick(e, ev)}
                    className={`rounded px-1 py-0.5 text-[10px] truncate cursor-pointer mb-0.5 ${ev.status === 'shifted' ? 'ring-1 ring-orange-400' : ''}`}
                    style={{
                      background: ev.status === 'done' ? '#22C55E22' : ev.status === 'missed' || ev.status === 'missed_and_shifted' ? '#EF444422' : `${ev.color}22`,
                      color: ev.status === 'done' ? '#22C55E' : ev.status === 'missed' || ev.status === 'missed_and_shifted' ? '#EF4444' : ev.color,
                    }}
                  >
                    {ev.label || EVENT_TYPES[ev.type]?.label || ev.type}
                  </div>
                ))}
                {!compact && dayEvents.length > 2 && (
                  <span className="text-text-muted text-[9px] pl-1">+{dayEvents.length - 2}</span>
                )}
                {compact && dayEvents.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mx-auto mt-0.5">
                    {dayEvents.slice(0, 3).map(ev => (
                      <div key={ev.id} className="w-1 h-1 rounded-full" style={{ background: ev.color }} />
                    ))}
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
        <h1 className="text-xl font-medium text-text-primary font-mono">Calendar</h1>
        <div className="flex items-center gap-2">
          {gateDate && (
            <button onClick={jumpToGate} className="btn-secondary text-xs">Jump to GATE date</button>
          )}
          <button
            onClick={() => setFullJourney(!fullJourney)}
            className={`btn-secondary text-xs ${fullJourney ? 'border-accent-blue text-accent-blue' : ''}`}
          >
            {fullJourney ? 'Month View' : 'Full Journey View'}
          </button>
        </div>
      </div>

      {!fullJourney ? (
        /* Month view */
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="text-text-muted hover:text-text-primary p-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h2 className="text-text-primary font-mono text-sm font-medium">
              {formatMonthYear(`${viewDate.year}-${String(viewDate.month + 1).padStart(2, '0')}-01`)}
            </h2>
            <button onClick={nextMonth} className="text-text-muted hover:text-text-primary p-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
          {renderCalendarGrid(viewDate.year, viewDate.month)}
        </div>
      ) : (
        /* Full Journey View */
        <div className="space-y-4">
          {journeyMonths.map(({ year, month }) => (
            <div key={`${year}-${month}`} className="card">
              <h3 className="text-xs font-mono text-text-muted mb-2">
                {formatMonthYear(`${year}-${String(month + 1).padStart(2, '0')}-01`)}
              </h3>
              {renderCalendarGrid(year, month, true)}
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 card">
        <div className="flex flex-wrap gap-4 text-xs text-text-muted">
          {Object.entries(EVENT_TYPES).map(([key, { label, color }]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span>{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-accent-green" /><span>Done</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-accent-red" /><span>Missed</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-400" /><span>Shifted</span></div>
        </div>
      </div>

      {/* Bulk Add Helper */}
      <div className="mt-4 card">
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
                    className={`px-2 py-1 rounded text-xs font-mono border transition-colors ${bulkForm.days.includes(i) ? 'border-accent-blue bg-accent-blue/10 text-accent-blue' : 'border-border text-text-muted'}`}
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
                  <div key={idx} className="flex items-center gap-2 p-2 bg-bg/50 border border-border rounded text-xs font-mono">
                    <span className="flex-1 text-text-primary">{t.description}</span>
                    <span className="text-text-muted">{t.estimatedHours}h</span>
                    <button 
                      onClick={() => setBulkForm(f => ({ ...f, tasks: f.tasks.filter((_, i) => i !== idx) }))}
                      className="text-accent-red hover:underline p-1"
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
          <div className="card max-w-sm w-full">
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
