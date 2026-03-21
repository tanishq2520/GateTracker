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
  contentStyle: { background: '#292524', border: '1px solid #44403C', borderRadius: '6px', color: '#FAFAF9' },
  tickStyle: { fill: '#A8A29E', fontSize: 10 },
  gridStyle: { stroke: '#44403C' },
};

export default function AnalyticsPage() {
  const subjects = useSubjectsStore(s => s.subjects);
  const { tests } = useMockTestStore();
  const { getLast30DaysData } = useDailyLogStore();
  const goals = useGoalsStore(s => s.goals);
  const events = useCalendarStore(s => s.events);
  const today = todayISO();

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
  const missedEvents = Object.values(events).filter(e => e.date < today && (e.status === 'missed' || (e.done === false && e.status === 'planned')));
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
      <h1 className="text-xl font-medium text-text-primary font-mono mb-6">Analytics</h1>

      {/* 10.3 — Daily Hours (Last 30 days) */}
      <div className="card">
        <h2 className="text-xs font-mono uppercase tracking-wider text-text-muted mb-3">Daily Hours Studied — Last 30 Days</h2>
        {last30.every(d => d.hours === 0) ? (
          <div className="text-text-muted text-sm text-center py-8">No study hours logged yet. Log today's study to see data here.</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dailyData} barSize={8}>
              <CartesianGrid strokeDasharray="3 3" stroke="#44403C" />
              <XAxis dataKey="date" tick={{ fill: '#8B90A0', fontSize: 8 }} interval={4} />
              <YAxis tick={{ fill: '#8B90A0', fontSize: 10 }} />
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
      <div className="card">
        <h2 className="text-xs font-mono uppercase tracking-wider text-text-muted mb-3">Subject Finish Date Projection</h2>
        {projectionData.length === 0 ? (
          <div className="text-text-muted text-sm">No subjects with planned end dates. Set up subjects with dates to see projections.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-text-muted text-xs font-mono">Subject</th>
                  <th className="text-left py-2 px-2 text-text-muted text-xs font-mono">Planned End</th>
                  <th className="text-left py-2 px-2 text-text-muted text-xs font-mono">Status</th>
                  <th className="text-left py-2 px-2 text-text-muted text-xs font-mono">Track</th>
                </tr>
              </thead>
              <tbody>
                {projectionData.map(r => (
                  <tr key={r.name} className="border-b border-border/50">
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                        <span className="text-text-primary text-sm">{r.name}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-text-secondary text-xs font-data">{r.planned}</td>
                    <td className="py-2 px-2">
                      {subjects[Object.keys(subjects).find(k => subjects[k].name === r.name)]?.status || 'not_started'}
                    </td>
                    <td className="py-2 px-2">
                      <span className={`text-xs font-mono ${r.onTrack ? 'text-accent-green' : 'text-accent-red'}`}>
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
      <div className="card">
        <h2 className="text-xs font-mono uppercase tracking-wider text-text-muted mb-3">Missed Days Analysis</h2>
        {missedEvents.length === 0 ? (
          <div className="text-text-muted text-sm">No missed days recorded yet.</div>
        ) : (
          <div>
            <div className="text-accent-orange text-sm font-mono mb-3">
              You missed {missedEvents.length} planned event{missedEvents.length > 1 ? 's' : ''} across {Object.keys(missedBySubject).length} subject{Object.keys(missedBySubject).length !== 1 ? 's' : ''}.
            </div>
            <div className="space-y-2">
              {Object.entries(missedBySubject).map(([subId, evs]) => {
                const subject = subjects[subId];
                return (
                  <div key={subId} className="flex items-center gap-3 text-sm">
                    {subject && <div className="w-2 h-2 rounded-full shrink-0" style={{ background: subject.color }} />}
                    <span className="text-text-primary">{subject?.name || 'Unknown'}</span>
                    <span className="text-accent-red text-xs font-mono">{evs.length} missed</span>
                  </div>
                );
              })}
              {missedEvents.filter(e => !e.subjectId).length > 0 && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-border shrink-0" />
                  <span className="text-text-secondary">Other events</span>
                  <span className="text-accent-red text-xs font-mono">{missedEvents.filter(e => !e.subjectId).length} missed</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 10.6 — Scatter: mock test score vs syllabus coverage */}
      {testsSorted.length >= 5 ? (
        <div className="card">
          <h2 className="text-xs font-mono uppercase tracking-wider text-text-muted mb-3">Mock Score vs Study Progress</h2>
          <p className="text-text-muted text-xs mb-3">Shows whether more syllabus coverage correlates with better scores.</p>
          <ResponsiveContainer width="100%" height={200}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#44403C" />
              <XAxis type="number" dataKey="x" name="Syllabus %" tick={{ fill: '#8B90A0', fontSize: 10 }} label={{ value: 'Syllabus %', fill: '#8B90A0', fontSize: 9, position: 'bottom' }} />
              <YAxis type="number" dataKey="y" name="Score %" tick={{ fill: '#8B90A0', fontSize: 10 }} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={CHART_STYLE.contentStyle} formatter={(v, n) => [`${v}%`, n]} />
              <Scatter data={scatterData} fill="#A78BFA" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      ) : testsSorted.length > 0 ? (
        <div className="card text-text-muted text-sm">
          Score vs Coverage scatter plot needs at least 5 mock tests. You have {testsSorted.length}. Add more test records to see this chart.
        </div>
      ) : null}

      {/* Empty state */}
      {subjectList.length === 0 && Object.values(tests).length === 0 && (
        <div className="text-center py-16 text-text-muted text-sm">
          No data yet. Set up your subjects, log your study sessions, and add mock test results to see analytics here.
        </div>
      )}
    </div>
  );
}
