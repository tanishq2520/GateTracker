// src/pages/DashboardPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { useGoalsStore } from '../stores/useGoalsStore';
import { useSubjectsStore } from '../stores/useSubjectsStore';
import { useCalendarStore, EVENT_TYPES } from '../stores/useCalendarStore';
import { useDailyLogStore } from '../stores/useDailyLogStore';
import { useAuthStore } from '../stores/useAuthStore';
import { useGamificationStore } from '../stores/useGamificationStore';
import { todayISO, formatDate, getMonthRange, formatMonthYear, addDaysToISO } from '../utils/dateUtils';
import { dailyLogsRef, calendarRef } from '../firebase/firestore';
import LogTodayModal from '../components/calendar/LogTodayModal';
import LevelBanner from '../components/gamification/LevelBanner';

const DAY_HDR = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const formatDayTypeLabel = (dayType) =>
  dayType
    ? dayType
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    : null;

const abbreviateLabel = (label) => {
  if (!label) return '';
  const keepAsIs = ['leave', 'sem exam', 'sem_exam', 'buffer', 'mock test', 'pyq day'];
  if (keepAsIs.some((value) => value === label.toLowerCase())) return label;
  const words = label.trim().split(' ').filter(Boolean);
  if (words.length <= 1) return label;
  return words.map((word) => word[0].toUpperCase()).join('');
};

const S = {
  card: { borderRadius: 16, padding: '18px 20px' },
  hdr: { fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'var(--font-body)' },
};

const GLASS_CARD = 'liquid-glass';

function TodayPlanSection({ cardStyle, headerStyle, log, uid, today, markTaskDone, setShowLogModal, mobile = false }) {
  return (
    <div className={GLASS_CARD} style={cardStyle}>
      <div style={headerStyle}>Today's Plan</div>
      {(!log || !log.tasks || log.tasks.length === 0) ? (
        <div style={{ fontSize: mobile ? 11 : 10, color: 'rgba(255,255,255,0.28)', fontFamily: 'var(--font-body)' }}>
          No tasks for today. <button onClick={() => setShowLogModal(true)} style={{ color: '#F97316', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Add your tasks →</button>
        </div>
      ) : (
        <>
          <div style={{ fontSize: mobile ? 11 : 10, color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-body)', marginBottom: mobile ? 10 : 8 }}>
            {mobile
              ? `${log.totalCompletedHours} / ${log.totalPlannedHours} hrs done`
              : `${log.totalCompletedHours} / ${log.totalPlannedHours} hrs done today (${log.tasks.filter((task) => task.done).length} done / ${log.tasks.filter((task) => !task.done).length} missed)`}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: mobile ? 6 : 4, marginBottom: mobile ? 10 : 8 }}>
            {log.tasks.map((task) => (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: mobile ? 8 : 6, padding: mobile ? '8px 9px' : '5px 8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: mobile ? 8 : 6 }}>
                <button
                  onClick={() => markTaskDone(uid, today, task.id, !task.done)}
                  title={task.done ? 'Mark as not done' : 'Mark as done'}
                  style={{ width: mobile ? 18 : 14, height: mobile ? 18 : 14, borderRadius: 3, border: `1px solid ${task.done ? '#34D399' : 'rgba(255,255,255,0.25)'}`, background: task.done ? '#34D399' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                >
                  {task.done ? (
                    <svg style={{ width: mobile ? 11 : 10, height: mobile ? 11 : 10, color: '#1C1917' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span style={{ color: '#F87171', fontSize: mobile ? 11 : 10, fontWeight: 700, lineHeight: 1 }}>x</span>
                  )}
                </button>
                <span style={{ flex: 1, fontSize: mobile ? 12 : 10, color: task.done ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.85)', fontFamily: 'var(--font-body)', textDecoration: task.done ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {task.description}
                </span>
                <span style={{ fontSize: mobile ? 10 : 9, color: 'rgba(255,255,255,0.28)', fontFamily: 'var(--font-mono)', width: mobile ? 34 : 26, textAlign: 'right', flexShrink: 0 }}>
                  {task.estimatedHours}h
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex' }}>
            <button
              onClick={() => setShowLogModal(true)}
              style={{ flex: 1, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: mobile ? 8 : 6, padding: mobile ? '8px 12px' : '6px 10px', fontSize: mobile ? 11 : 10, fontFamily: 'var(--font-body)', cursor: 'pointer', transition: 'background 0.2s' }}
              onMouseEnter={(event) => { event.target.style.background = 'rgba(255,255,255,0.10)'; }}
              onMouseLeave={(event) => { event.target.style.background = 'rgba(255,255,255,0.06)'; }}
            >
              Manage Tasks
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Next7DaysSection({ cardStyle, headerStyle, next7, mobile = false }) {
  return (
    <div className={GLASS_CARD} style={cardStyle}>
      <div style={headerStyle}>Next 7 Days</div>
      {next7.length === 0 ? (
        <div style={{ fontSize: mobile ? 11 : 10, color: 'rgba(255,255,255,0.28)', fontFamily: 'var(--font-body)' }}>
          Nothing planned. <Link to="/calendar" style={{ color: '#F97316' }}>Add events →</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: mobile ? 8 : 5 }}>
          {next7.map((entry) => (
            <div key={entry.date} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: mobile ? 11 : 9, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)', width: mobile ? 54 : 44, flexShrink: 0 }}>
                {formatDate(entry.date, 'MMM d')}
              </span>
              <div style={{ width: mobile ? 6 : 5, height: mobile ? 6 : 5, borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
              <span style={{ fontSize: mobile ? 12 : 10, color: 'rgba(255,255,255,0.8)', fontFamily: 'var(--font-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const today = todayISO();
  const goals = useGoalsStore((state) => state.goals);
  const getDaysToExam = useGoalsStore((state) => state.getDaysToExam);
  const getPrepDay = useGoalsStore((state) => state.getPrepDay);
  const subjects = useSubjectsStore((state) => state.subjects);
  const getOverallProgress = useSubjectsStore((state) => state.getOverallProgress);
  const events = useCalendarStore((state) => state.events);
  const dailyLogs = useDailyLogStore((state) => state.logs);
  const todayLog = useDailyLogStore((state) => state.getTodayLog);
  const markTaskDone = useDailyLogStore((state) => state.markTaskDone);
  const uid = useAuthStore((state) => state.uid);
  const streak = useGamificationStore((state) => state.streak);

  const [showLogModal, setShowLogModal] = useState(false);
  const [calView, setCalView] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() });
  const [fullJourney, setFullJourney] = useState(false);
  const [liveDailyLogs, setLiveDailyLogs] = useState(null);
  const [liveEvents, setLiveEvents] = useState(null);

  const daysLeft = getDaysToExam();
  const prepDay = getPrepDay();
  const progress = getOverallProgress();
  const log = todayLog();
  const dailyLogsByDate = useMemo(() => ({ ...(liveDailyLogs ?? {}), ...dailyLogs }), [liveDailyLogs, dailyLogs]);
  // Merge live calendarEvents snapshot on top of store events for real-time sync
  const mergedEvents = useMemo(() => ({ ...events, ...(liveEvents ?? {}) }), [events, liveEvents]);
  const visibleEvents = useMemo(() => Object.values(mergedEvents).filter((event) => event.source !== 'day_type'), [mergedEvents]);

  useEffect(() => {
    if (!uid) {
      setLiveDailyLogs(null);
      return undefined;
    }

    return onSnapshot(dailyLogsRef(uid), (snapshot) => {
      const nextLogs = {};
      snapshot.forEach((docSnap) => {
        nextLogs[docSnap.id] = docSnap.data();
      });
      setLiveDailyLogs(nextLogs);
    });
  }, [uid]);

  useEffect(() => {
    if (!uid) { setLiveEvents(null); return undefined; }
    return onSnapshot(calendarRef(uid), (snapshot) => {
      const nextEvents = {};
      snapshot.forEach((docSnap) => {
        nextEvents[docSnap.id] = { id: docSnap.id, ...docSnap.data() };
      });
      setLiveEvents(nextEvents);
    });
  }, [uid]);

  const getTasksForDate = (date) => dailyLogsByDate[date]?.tasks || [];
  const getExplicitDayTypeForDate = (date) =>
    dailyLogsByDate[date]?.dayType
    || Object.values(events).find((event) => event.date === date && event.source === 'day_type')?.type
    || null;

  const getCellLabel = (date) => {
    // Always prefer live task data — calendarEvent labels can be stale
    const tasks = getTasksForDate(date);
    if (tasks.length > 0) {
      const subjectNames = [...new Set(
        tasks
          .map((task) => task.subjectId)
          .filter(Boolean)
          .map((subjectId) => subjects[subjectId]?.name || subjectId)
      )];
      if (subjectNames.length === 1) return subjectNames[0];
      if (subjectNames.length === 2) return subjectNames.join(' + ');
      if (subjectNames.length > 2) return `${subjectNames[0]} +${subjectNames.length - 1} more`;
      return tasks[0]?.description || 'Study';
    }
    // Fall back to calendarEvent label only if no tasks in dailyLogs
    const primaryEvent = visibleEvents.find((event) => event.date === date);
    if (primaryEvent?.label) return primaryEvent.label;
    return formatDayTypeLabel(getExplicitDayTypeForDate(date));
  };

  const getLogColor = (date) => {
    const explicitDayType = getExplicitDayTypeForDate(date);
    if (explicitDayType && explicitDayType !== 'study') {
      return EVENT_TYPES[explicitDayType]?.color || EVENT_TYPES.study.color;
    }
    const tasks = getTasksForDate(date);
    return subjects[tasks[0]?.subjectId]?.color || EVENT_TYPES.study.color;
  };

  const calendarDisplayMap = useMemo(() => {
    const displayMap = {};
    visibleEvents.forEach((event) => {
      if (displayMap[event.date]) return;
      displayMap[event.date] = {
        date: event.date,
        type: event.type,
        label: event.label || null,
        color: event.color || EVENT_TYPES[event.type]?.color || EVENT_TYPES.study.color,
        status: event.status || 'planned',
        source: 'event',
      };
    });
    Object.entries(dailyLogsByDate).forEach(([date, dayLog]) => {
      const hasTasks = (dayLog.tasks || []).length > 0;
      const explicitDayType = getExplicitDayTypeForDate(date);
      if (!displayMap[date] && (hasTasks || explicitDayType)) {
        displayMap[date] = { date, type: explicitDayType || 'study', label: null, color: getLogColor(date), status: 'planned', source: 'log' };
      }
      if (displayMap[date] && hasTasks) {
        // Tasks exist — always override with live-computed label
        displayMap[date].label = getCellLabel(date);
        displayMap[date].color = getLogColor(date);
      } else if (displayMap[date] && !displayMap[date].label) {
        displayMap[date].label = getCellLabel(date);
      }
      if (displayMap[date] && displayMap[date].source === 'log') displayMap[date].color = getLogColor(date);
    });
    Object.keys(displayMap).forEach((date) => {
      if (!displayMap[date].label) displayMap[date].label = getCellLabel(date);
    });
    return displayMap;
  }, [visibleEvents, dailyLogsByDate, subjects, mergedEvents]);

  const getDisplayPillStyle = (entry) => {
    const isDone = entry?.status === 'done';
    const isMissed = entry?.status === 'missed' || entry?.status === 'missed_and_shifted';
    return { background: isDone ? '#22C55E22' : isMissed ? '#EF444422' : `${entry.color}22`, color: isDone ? '#22C55E' : isMissed ? '#EF4444' : entry.color };
  };

  const next7 = useMemo(() => {
    const end = addDaysToISO(today, 7);
    return Object.values(calendarDisplayMap)
      .filter((entry) => entry.date >= today && entry.date <= end && entry.label)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 7);
  }, [calendarDisplayMap, today]);

  const dayTypeByDate = useMemo(() => {
    const fromLogs = Object.entries(dailyLogsByDate).reduce((acc, [date, dayLog]) => {
      if (dayLog?.dayType) acc[date] = dayLog.dayType;
      return acc;
    }, {});
    Object.values(mergedEvents).forEach((event) => {
      if ((event.source === 'day_type' || event.type === 'leave' || event.type === 'sem_exam') && !fromLogs[event.date]) {
        fromLogs[event.date] = event.type;
      }
    });
    return fromLogs;
  }, [dailyLogsByDate, mergedEvents]);

  const leaveDays = useMemo(() => Object.values(dayTypeByDate).filter((type) => type === 'leave').length, [dayTypeByDate]);
  const semExamShiftDays = useMemo(() => Object.values(dayTypeByDate).filter((type) => type === 'sem_exam').length, [dayTypeByDate]);

  const journeyMonths = useMemo(() => {
    if (!fullJourney) return [];
    const months = [];
    const start = new Date();
    const end = goals.gateExamDate ? new Date(goals.gateExamDate) : new Date(start.getFullYear(), start.getMonth() + 6, 1);
    let current = new Date(start.getFullYear(), start.getMonth(), 1);
    while (current <= end) {
      months.push({ year: current.getFullYear(), month: current.getMonth() });
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    }
    return months;
  }, [fullJourney, goals.gateExamDate]);

  const subjectList = Object.values(subjects);

  const driftColor = (diff) => {
    if (diff <= 0) return '#84CC16';
    if (diff <= 3) return '#FBBF24';
    if (diff <= 7) return '#F97316';
    return '#EF4444';
  };

  const renderCalGrid = (year, month, compact = false) => {
    const days = getMonthRange(year, month);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: compact ? 2 : 3, marginBottom: 4 }}>
          {DAY_HDR.map((day) => (
            <div key={`${year}-${month}-${day}`} style={{ textAlign: 'center', fontSize: 7, color: '#57534E', fontFamily: 'DM Mono,monospace' }}>
              {day}
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: 'repeat(6, minmax(0, 1fr))', gap: compact ? 2 : 3, flex: 1, minHeight: 0 }}>
          {days.map(({ date, inMonth }) => {
            const displayEntry = calendarDisplayMap[date] || null;
            const isToday = date === today;
            return (
              <Link
                key={date}
                to="/calendar"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${isToday ? '#F97316' : 'rgba(255,255,255,0.06)'}`, borderRadius: 3, minHeight: compact ? 22 : 38, display: 'flex', flexDirection: 'column', alignItems: 'stretch', padding: compact ? '2px 3px' : '3px 4px', opacity: inMonth ? 1 : 0.18, pointerEvents: inMonth ? 'auto' : 'none', textDecoration: 'none', position: 'relative', overflow: 'hidden', minWidth: 0 }}
              >
                <span style={{ fontSize: compact ? 6 : 8, color: isToday ? '#F97316' : date < today ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.75)', fontFamily: 'var(--font-mono)', fontWeight: isToday ? 700 : 400, lineHeight: 1.2, textAlign: 'center' }}>
                  {new Date(`${date}T00:00:00`).getDate()}
                </span>
                {displayEntry?.label && (
                  <div style={{ ...getDisplayPillStyle(displayEntry), marginTop: 'auto', marginBottom: compact ? 1 : 2, marginLeft: compact ? 1 : 2, marginRight: compact ? 1 : 2, borderRadius: 4, padding: compact ? '1px 3px' : '2px 4px', fontSize: compact ? 6 : 8, fontFamily: 'DM Sans,sans-serif', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'left' }}>
                    {abbreviateLabel(displayEntry.label)}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  const gateYearLabel = goals.gateExamDate ? new Date(goals.gateExamDate).getFullYear() : 'GATE';
  const mobileDateLabel = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'auto', boxSizing: 'border-box', minHeight: '100%' }}>
      <style>{`
        @media (max-width: 767px) {
          .desktop-dashboard { display: none !important; }
          .mobile-dashboard { display: flex !important; }
        }
        @media (min-width: 768px) {
          .desktop-dashboard { display: flex !important; }
          .mobile-dashboard { display: none !important; }
        }
      `}</style>

      <div className="desktop-dashboard" style={{ flexDirection: 'column', gap: 16, flex: 1 }}>
        <LevelBanner />

        {/* Hero section */}
        <div style={{ paddingBottom: 8 }} className="animate-fade-rise">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 400, color: 'rgba(255,255,255,0.95)', letterSpacing: '-0.03em', lineHeight: 1 }}>
            {daysLeft !== null ? daysLeft : '—'} days
          </div>
          <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-body)', marginTop: 4 }}>
            until GATE {gateYearLabel}
          </div>
          <div style={{ marginTop: 12, fontSize: 13, color: 'rgba(255,255,255,0.45)', fontStyle: 'italic', borderLeft: '2px solid rgba(255,255,255,0.15)', paddingLeft: 12 }}>
            {prepDay ? `Prep Day ${prepDay}` : 'Set your exam date to begin'} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </div>
        </div>

        {/* Stat cards row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, flexShrink: 0 }} className="animate-fade-rise-2">
          <div className={GLASS_CARD} style={S.card}>
            <div style={S.hdr}>Syllabus</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 600, color: '#F97316', lineHeight: 1 }}>{progress.percent}%</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', fontFamily: 'var(--font-body)', marginTop: 4 }}>{progress.doneUnits}/{progress.totalUnits} units</div>
          </div>
          <div className={GLASS_CARD} style={S.card}>
            <div style={S.hdr}>Streak</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 600, color: '#F97316', lineHeight: 1 }}>{streak.currentStreak}d</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#F97316"><path d="M12 2C12 2 7 8 7 13a5 5 0 0 0 10 0c0-2.5-1.5-5-1.5-5S14 11 12 11c-1 0-2-1-2-2.5C10 7 12 2 12 2Z" /></svg>
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', fontFamily: 'var(--font-body)', marginTop: 4 }}>best: {streak.longestStreak}d</div>
          </div>
          <div className={GLASS_CARD} style={S.card}>
            <div style={S.hdr}>Schedule</div>
            {leaveDays === 0 ? (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: '#34D399', fontWeight: 600 }}>On track</div>
            ) : (
              <>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: driftColor(leaveDays), fontWeight: 600 }}>+{leaveDays}d behind</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', fontFamily: 'var(--font-body)', marginTop: 3, lineHeight: 1.4 }}>{leaveDays} leave day{leaveDays > 1 ? 's' : ''} taken</div>
              </>
            )}
            {leaveDays === 0 && semExamShiftDays > 0 && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', fontFamily: 'var(--font-body)', marginTop: 3 }}>+{semExamShiftDays} sem exam days adjusted</div>}
          </div>
          <div className={GLASS_CARD} style={S.card}>
            <div style={S.hdr}>Mock Avg</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 600, color: 'rgba(255,255,255,0.6)', lineHeight: 1 }}>—</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', fontFamily: 'var(--font-body)', marginTop: 4 }}>log mock tests</div>
          </div>
        </div>

        {/* Main content grid */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }} className="animate-fade-rise-3">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <TodayPlanSection cardStyle={{ ...S.card, flexShrink: 0 }} headerStyle={S.hdr} log={log} uid={uid} today={today} markTaskDone={markTaskDone} setShowLogModal={setShowLogModal} />

            <div className={GLASS_CARD} style={{ ...S.card, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={S.hdr}>Subjects</div>
              {subjectList.length === 0 ? (
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', fontFamily: 'var(--font-body)' }}>No subjects yet. <Link to="/subjects" style={{ color: '#F97316' }}>Add subjects →</Link></div>
              ) : (
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {subjectList.map((subject) => {
                    const units = subject.units || [];
                    const done = units.filter((unit) => unit.done).length;
                    const pct = units.length > 0 ? Math.round((done / units.length) * 100) : 0;
                    return (
                      <Link key={subject.id} to={`/subjects/${subject.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 24, textDecoration: 'none', flexShrink: 0 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: subject.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', fontFamily: 'var(--font-body)', width: 70, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subject.name.split(' ')[0]}</span>
                        <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 9999, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: subject.color, borderRadius: 9999 }} />
                        </div>
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', fontFamily: 'var(--font-mono)', width: 32, textAlign: 'right', flexShrink: 0 }}>{done}/{units.length}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <div className={GLASS_CARD} style={{ ...S.card, flexShrink: 0 }}>
              <WeeklyChallengeInline />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className={GLASS_CARD} style={{ ...S.card, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={S.hdr}>Calendar</span>
                <button onClick={() => setFullJourney(!fullJourney)} style={{ fontSize: 9, color: fullJourney ? '#F97316' : 'rgba(255,255,255,0.28)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                  {fullJourney ? 'Month' : 'Full Journey'}
                </button>
              </div>
              {!fullJourney ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <button onClick={() => setCalView((view) => { const date = new Date(view.year, view.month - 1); return { year: date.getFullYear(), month: date.getMonth() }; })} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: '0 4px', fontSize: 14, lineHeight: 1 }}>‹</button>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-body)' }}>{formatMonthYear(`${calView.year}-${String(calView.month + 1).padStart(2, '0')}-01`)}</span>
                    <button onClick={() => setCalView((view) => { const date = new Date(view.year, view.month + 1); return { year: date.getFullYear(), month: date.getMonth() }; })} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: '0 4px', fontSize: 14, lineHeight: 1 }}>›</button>
                  </div>
                  <div style={{ flex: 1 }}>{renderCalGrid(calView.year, calView.month)}</div>
                </div>
              ) : (
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {journeyMonths.map(({ year, month }) => (
                    <div key={`${year}-${month}`}>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', fontFamily: 'var(--font-body)', marginBottom: 3 }}>{formatMonthYear(`${year}-${String(month + 1).padStart(2, '0')}-01`)}</div>
                      {renderCalGrid(year, month, true)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Next7DaysSection cardStyle={{ ...S.card, flexShrink: 0 }} headerStyle={S.hdr} next7={next7} />
          </div>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="mobile-dashboard" style={{ display: 'none', flexDirection: 'column', gap: 12, paddingBottom: 40 }}>
        <div style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'rgba(255,255,255,0.95)', letterSpacing: '-0.02em' }}>
            {daysLeft ?? '—'} days
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-body)', fontSize: 13 }}>until GATE {gateYearLabel}</div>
          <div style={{ color: '#A8A29E', fontSize: 11, fontFamily: 'var(--font-body)', marginTop: 6 }}>{prepDay ? `Prep Day ${prepDay} · ` : ''}{mobileDateLabel}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          <div className="liquid-glass" style={{ borderRadius: 12, padding: '12px 10px', minWidth: 0 }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Syllabus</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#F97316', fontFamily: 'var(--font-mono)', marginTop: 4 }}>{progress.percent}%</div>
          </div>
          <div className="liquid-glass" style={{ borderRadius: 12, padding: '12px 10px', minWidth: 0 }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Streak</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#F97316', fontFamily: 'var(--font-mono)', marginTop: 4 }}>{streak.currentStreak}d</div>
          </div>
          <div className="liquid-glass" style={{ borderRadius: 12, padding: '12px 10px', minWidth: 0 }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sched</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: leaveDays > 0 ? '#F97316' : '#34D399', fontFamily: 'var(--font-mono)', marginTop: 6 }}>{leaveDays > 0 ? `+${leaveDays}d` : 'OK'}</div>
          </div>
        </div>

        <TodayPlanSection cardStyle={{ ...S.card }} headerStyle={S.hdr} log={log} uid={uid} today={today} markTaskDone={markTaskDone} setShowLogModal={setShowLogModal} mobile />
        <Next7DaysSection cardStyle={{ ...S.card }} headerStyle={S.hdr} next7={next7} mobile />
      </div>

      {showLogModal && <LogTodayModal onClose={() => setShowLogModal(false)} />}
    </div>
  );
}

function WeeklyChallengeInline() {
  const challenge = useGamificationStore((state) => state.weeklyChallenge);
  if (!challenge) return <div style={{ fontSize: 9, color: '#57534E', fontFamily: 'DM Mono,monospace' }}>No challenge this week.</div>;
  const pct = challenge.target > 0 ? Math.min(100, Math.round((challenge.progress / challenge.target) * 100)) : 0;
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 10, color: '#A8A29E', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'DM Mono,monospace' }}>Weekly Challenge</span>
        <span style={{ fontSize: 9, color: '#F97316', fontFamily: 'JetBrains Mono,monospace', fontWeight: 600 }}>+{challenge.xpReward} XP</span>
      </div>
      {challenge.completed ? (
        <div style={{ fontSize: 9, color: '#84CC16', fontFamily: 'DM Mono,monospace', fontWeight: 600 }}>Done ✓ +{challenge.xpReward} XP</div>
      ) : (
        <>
          <div style={{ fontSize: 9, color: '#FAFAF9', fontFamily: 'DM Sans,sans-serif', marginBottom: 6, lineHeight: 1.4 }}>{challenge.label}</div>
          <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 9999, overflow: 'hidden', marginBottom: 4 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: '#F97316', borderRadius: 9999 }} />
          </div>
          <div style={{ fontSize: 7, color: '#A8A29E', fontFamily: 'JetBrains Mono,monospace' }}>{challenge.progress} / {challenge.target} · +{challenge.xpReward} XP</div>
        </>
      )}
    </>
  );
}
