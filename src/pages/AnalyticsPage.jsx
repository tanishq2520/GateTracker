// src/pages/AnalyticsPage.jsx
import React, { useMemo } from 'react';
import { useSubjectsStore } from '../stores/useSubjectsStore';
import { useMockTestStore } from '../stores/useMockTestStore';
import { useDailyLogStore } from '../stores/useDailyLogStore';
import { useGoalsStore } from '../stores/useGoalsStore';
import { useCalendarStore } from '../stores/useCalendarStore';
import { todayISO, formatDate, formatShort } from '../utils/dateUtils';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Legend,
} from 'recharts';

const CHART_STYLE = {
  contentStyle: { background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: 'rgba(255,255,255,0.9)' },
  tickStyle: { fill: 'rgba(255,255,255,0.4)', fontSize: 10 },
  gridStyle: { stroke: 'rgba(255,255,255,0.06)' },
};

export default function AnalyticsPage() {
  const subjects = useSubjectsStore(s => s.subjects);
  const { tests } = useMockTestStore();
  const { getLast30DaysData } = useDailyLogStore();
  const goals = useGoalsStore(s => s.goals);
  const events = useCalendarStore(s => s.events);
  const today = todayISO();
  const missedTypes = useMemo(() => new Set(['study', 'revision', 'pyq', 'subject_test']), []);

  // 10.1 — Syllabus coverage over time (approximate from daily logs and unit completion)
  const subjectList = Object.values(subjects);
  const totalTopics = subjectList.reduce((acc, s) => acc + (s.units || []).reduce((a, u) => a + (u.totalTopics || 0), 0), 0);

  // 10.3 — Daily hours (last 30 days)
  const last30 = getLast30DaysData();
  const dailyTarget = goals.dailyHourTarget || 5;
  const dailyData = last30.map(d => {
    let fill = 'transparent';
    if (d.hours >= dailyTarget) fill = '#84CC16'; // Green
    else if (d.hours > 0) fill = '#FBBF24'; // Yellow
    else if (d.hours === 0 && d.planned > 0) fill = '#EF4444'; // Red (planned but 0 done)
    
    return {
      date: formatShort(d.date),
      hours: d.hours,
      planned: d.planned,
      target: dailyTarget,
      fill: fill
    };
  });

  // 10.4 — Missed days analysis
  const missedEvents = Object.values(events).filter(e =>
    e.date < today &&
    e.source !== 'day_type' &&
    missedTypes.has(e.type) &&
    (e.status === 'missed' || (e.done === false && e.status === 'planned'))
  );
  const missedBySubject = {};
  missedEvents.forEach(e => {
    if (e.subjectId) {
      if (!missedBySubject[e.subjectId]) missedBySubject[e.subjectId] = [];
      missedBySubject[e.subjectId].push(e);
    }
  });

  // 10.5 — Revised finish date projection
  const projectionData = subjectList
    .filter(s => s.plannedEndDate)
    .map(s => ({
      name: s.name,
      color: s.color,
      planned: formatDate(s.plannedEndDate),
      projected: s.plannedEndDate,
      onTrack: !s.plannedEndDate || s.plannedEndDate >= today || s.status === 'completed',
    }));

  // 10.6 — Mock test scatter
  const testsSorted = Object.values(tests).sort((a, b) => a.date.localeCompare(b.date));
  const scatterData = testsSorted.map((t, i) => ({
    x: Math.round((i / Math.max(testsSorted.length - 1, 1)) * 100), // approx syllabus % at test time
    y: t.totalMarks > 0 ? Math.round((t.scored / t.totalMarks) * 100) : 0,
    name: t.testName,
  }));

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'rgba(255,255,255,0.9)', letterSpacing: '-0.02em', marginBottom: 24 }}>Analytics</h1>

      {/* 10.3 — Daily Hours (Last 30 days) */}
      <div className="liquid-glass" style={{ borderRadius: 16, padding: '18px 20px' }}>
        <h2 style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Daily Hours Studied — Last 30 Days</h2>
        {last30.every(d => d.hours === 0) ? (
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>No study hours logged yet. Log today's study to see data here.</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dailyData} barSize={8}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 8 }} interval={4} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
              <Tooltip contentStyle={CHART_STYLE.contentStyle} />
              <ReferenceLine y={dailyTarget} stroke="#F97316" strokeDasharray="4 4" />
              <Bar dataKey="hours" radius={[2, 2, 0, 0]}
                   minPointSize={2}
                   label={false}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 10.5 — Finish date projection */}
      <div className="liquid-glass" style={{ borderRadius: 16, padding: '18px 20px' }}>
        <h2 style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Subject Finish Date Projection</h2>
        {projectionData.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>No subjects with planned end dates. Set up subjects with dates to see projections.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 400 }}>Subject</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 400 }}>Planned End</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 400 }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 400 }}>Track</th>
                </tr>
              </thead>
              <tbody>
                {projectionData.map(r => (
                  <tr key={r.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '8px 8px' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                        <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>{r.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '8px 8px', color: 'rgba(255,255,255,0.55)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>{r.planned}</td>
                    <td style={{ padding: '8px 8px', color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>
                      {subjects[Object.keys(subjects).find(k => subjects[k].name === r.name)]?.status || 'not_started'}
                    </td>
                    <td style={{ padding: '8px 8px' }}>
                      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: r.onTrack ? '#34D399' : '#F87171' }}>
                        {r.onTrack ? 'On track' : 'Overdue'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 10.4 — Missed days */}
      <div className="liquid-glass" style={{ borderRadius: 16, padding: '18px 20px' }}>
        <h2 style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Missed Days Analysis</h2>
        {missedEvents.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>No missed days recorded yet.</div>
        ) : (
          <div>
            <div style={{ color: '#FBBF24', fontSize: 13, fontFamily: 'var(--font-mono)', marginBottom: 12 }}>
              You missed {missedEvents.length} planned event{missedEvents.length > 1 ? 's' : ''} across {Object.keys(missedBySubject).length} subject{Object.keys(missedBySubject).length !== 1 ? 's' : ''}.
            </div>
            <div className="space-y-2">
              {Object.entries(missedBySubject).map(([subId, evs]) => {
                const subject = subjects[subId];
                return (
                  <div key={subId} className="flex items-center gap-3 text-sm">
                    {subject && <div className="w-2 h-2 rounded-full shrink-0" style={{ background: subject.color }} />}
                    <span style={{ color: 'rgba(255,255,255,0.85)' }}>{subject?.name || 'Unknown'}</span>
                    <span style={{ color: '#F87171', fontSize: 11, fontFamily: 'var(--font-mono)' }}>{evs.length} missed</span>
                  </div>
                );
              })}
              {missedEvents.filter(e => !e.subjectId).length > 0 && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.25)' }} />
                  <span style={{ color: 'rgba(255,255,255,0.55)' }}>Other events</span>
                  <span style={{ color: '#F87171', fontSize: 11, fontFamily: 'var(--font-mono)' }}>{missedEvents.filter(e => !e.subjectId).length} missed</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 10.6 — Scatter: mock test score vs syllabus coverage */}
      {testsSorted.length >= 5 ? (
        <div className="liquid-glass" style={{ borderRadius: 16, padding: '18px 20px' }}>
          <h2 style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Mock Score vs Study Progress</h2>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginBottom: 12 }}>Shows whether more syllabus coverage correlates with better scores.</p>
          <ResponsiveContainer width="100%" height={200}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis type="number" dataKey="x" name="Syllabus %" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} label={{ value: 'Syllabus %', fill: 'rgba(255,255,255,0.35)', fontSize: 9, position: 'bottom' }} />
              <YAxis type="number" dataKey="y" name="Score %" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={CHART_STYLE.contentStyle} formatter={(v, n) => [`${v}%`, n]} />
              <Scatter data={scatterData} fill="#A78BFA" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      ) : testsSorted.length > 0 ? (
        <div className="liquid-glass" style={{ borderRadius: 16, padding: '18px 20px', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
          Score vs Coverage scatter plot needs at least 5 mock tests. You have {testsSorted.length}. Add more test records to see this chart.
        </div>
      ) : null}

      {/* Empty state */}
      {subjectList.length === 0 && Object.values(tests).length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
          No data yet. Set up your subjects, log your study sessions, and add mock test results to see analytics here.
        </div>
      )}
    </div>
  );
}
