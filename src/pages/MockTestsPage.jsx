// src/pages/MockTestsPage.jsx
import React, { useState } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useMockTestStore } from '../stores/useMockTestStore';
import { useSubjectsStore } from '../stores/useSubjectsStore';
import { useGoalsStore } from '../stores/useGoalsStore';
import { useUIStore } from '../stores/useUIStore';
import { todayISO, formatDate } from '../utils/dateUtils';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, ResponsiveContainer, Legend,
} from 'recharts';

const PLATFORMS = ['GATE Overflow', 'Made Easy', 'TestBook', 'Unacademy', 'NPTEL', 'Self', 'Other'];

const EMPTY_FORM = {
  testName: '', date: todayISO(), platform: 'Self',
  scored: '', totalMarks: 100, percentile: '',
  notes: '', subjectBreakdown: {},
};

export default function MockTestsPage() {
  const { uid } = useAuthStore();
  const { tests, addTest, updateTest, deleteTest, getTestsSorted, getScoreStats } = useMockTestStore();
  const subjects = useSubjectsStore(s => s.subjects);
  const goals = useGoalsStore(s => s.goals);
  const showToast = useUIStore(s => s.showToast);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const sorted = getTestsSorted();
  const stats = getScoreStats();

  const handleSave = async () => {
    if (!form.testName || !form.date) { showToast('Test name and date are required.', 'warning'); return; }
    setSaving(true);
    const data = {
      ...form,
      scored: parseFloat(form.scored) || 0,
      totalMarks: parseInt(form.totalMarks) || 100,
      percentile: form.percentile ? parseFloat(form.percentile) : null,
    };
    if (editingId) {
      await updateTest(uid, editingId, data);
      showToast('Test updated.', 'success');
    } else {
      await addTest(uid, data);
      showToast('Test added.', 'success');
    }
    setForm({ ...EMPTY_FORM }); setEditingId(null); setShowForm(false);
    setSaving(false);
  };

  const handleEdit = (test) => {
    setForm({ ...EMPTY_FORM, ...test });
    setEditingId(test.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this test record?')) {
      await deleteTest(uid, id);
      showToast('Test deleted.', 'info');
    }
  };

  // Chart data
  const scoreData = sorted.reverse().map((t, i) => ({
    name: `#${i + 1}`,
    score: t.totalMarks > 0 ? Math.round((t.scored / t.totalMarks) * 100) : 0,
    percentile: t.percentile,
  }));
  const scoreSorted = [...sorted].reverse();

  const distributionData = [
    { range: '0-40%', count: scoreSorted.filter(t => (t.scored / t.totalMarks) * 100 < 40).length },
    { range: '41-50%', count: scoreSorted.filter(t => { const p = (t.scored / t.totalMarks) * 100; return p >= 41 && p <= 50; }).length },
    { range: '51-60%', count: scoreSorted.filter(t => { const p = (t.scored / t.totalMarks) * 100; return p >= 51 && p <= 60; }).length },
    { range: '61-70%', count: scoreSorted.filter(t => { const p = (t.scored / t.totalMarks) * 100; return p >= 61 && p <= 70; }).length },
    { range: '71-80%', count: scoreSorted.filter(t => { const p = (t.scored / t.totalMarks) * 100; return p >= 71 && p <= 80; }).length },
    { range: '81%+', count: scoreSorted.filter(t => (t.scored / t.totalMarks) * 100 > 80).length },
  ];

  const hasPercentile = scoreSorted.filter(t => t.percentile).length >= 3;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium text-text-primary font-mono">Mock Tests</h1>
          {stats && (
            <p className="text-text-muted text-xs mt-1 font-mono">
              Best: {stats.best}% | Avg: {stats.avg}% | Last: {stats.last}%
            </p>
          )}
        </div>
        <button onClick={() => { setShowForm(!showForm); setForm({ ...EMPTY_FORM }); setEditingId(null); }} className="btn-primary text-sm">
          {showForm ? 'Cancel' : '+ Add Test'}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="card mb-6">
          <h3 className="text-sm font-mono font-medium text-text-primary mb-4">{editingId ? 'Edit Test' : 'Add Mock Test'}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Test Name</label>
              <input value={form.testName} onChange={e => setForm(f => ({ ...f, testName: e.target.value }))} placeholder="e.g. Mock Test 4" className="input" />
            </div>
            <div>
              <label className="label">Date (today or past)</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} max={todayISO()} className="input" />
            </div>
            <div>
              <label className="label">Platform</label>
              <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} className="input">
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Marks Scored</label>
              <input type="number" value={form.scored} onChange={e => setForm(f => ({ ...f, scored: e.target.value }))} placeholder="e.g. 62" className="input" />
            </div>
            <div>
              <label className="label">Total Marks</label>
              <input type="number" value={form.totalMarks} onChange={e => setForm(f => ({ ...f, totalMarks: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label">Percentile (optional)</label>
              <input type="number" value={form.percentile} onChange={e => setForm(f => ({ ...f, percentile: e.target.value }))} placeholder="e.g. 71.2" className="input" />
            </div>
          </div>

          <div className="mt-4">
            <label className="label">Notes / Observations</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Strong in DS, weak in TOC..." className="input resize-none" />
          </div>

          {/* Subject breakdown */}
          <div className="mt-4">
            <button onClick={() => setShowBreakdown(!showBreakdown)} className="text-xs text-accent-blue hover:underline">
              {showBreakdown ? 'Hide' : 'Add'} Subject-wise Breakdown (optional)
            </button>
            {showBreakdown && (
              <div className="mt-3 space-y-2">
                {Object.values(subjects).map(s => {
                  const bd = form.subjectBreakdown[s.id] || { attempted: '', correct: '', marks: '' };
                  return (
                    <div key={s.id} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                      <span className="text-text-secondary text-xs w-40 shrink-0">{s.name}</span>
                      <input type="number" placeholder="Attempted" value={bd.attempted} onChange={e => setForm(f => ({ ...f, subjectBreakdown: { ...f.subjectBreakdown, [s.id]: { ...bd, attempted: parseInt(e.target.value) || 0 } } }))} className="input w-24 text-xs py-1" />
                      <input type="number" placeholder="Correct" value={bd.correct} onChange={e => setForm(f => ({ ...f, subjectBreakdown: { ...f.subjectBreakdown, [s.id]: { ...bd, correct: parseInt(e.target.value) || 0 } } }))} className="input w-24 text-xs py-1" />
                      <input type="number" placeholder="Marks" value={bd.marks} onChange={e => setForm(f => ({ ...f, subjectBreakdown: { ...f.subjectBreakdown, [s.id]: { ...bd, marks: parseFloat(e.target.value) || 0 } } }))} className="input w-24 text-xs py-1" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving...' : editingId ? 'Update' : 'Save Test'}</button>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {sorted.length === 0 && (
        <div className="text-center py-16 text-text-muted text-sm">
          No tests recorded yet. Click 'Add Test' after taking your first mock.
        </div>
      )}

      {/* Charts */}
      {sorted.length >= 2 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Score trend */}
          <div className="card">
            <h3 className="text-xs font-mono uppercase tracking-wider text-text-muted mb-3">Score Trend</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={scoreData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#44403C" />
                <XAxis dataKey="name" tick={{ fill: '#8B90A0', fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#8B90A0', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#292524', border: '1px solid #44403C', borderRadius: '6px', color: '#FAFAF9' }} />
                {goals.targetScore && <ReferenceLine y={goals.targetScore} stroke="#F59E0B" strokeDasharray="4 4" label={{ value: 'Target', fill: '#F59E0B', fontSize: 10 }} />}
                <Line type="monotone" dataKey="score" stroke="#4F8EF7" dot={{ fill: '#4F8EF7' }} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Distribution */}
          <div className="card">
            <h3 className="text-xs font-mono uppercase tracking-wider text-text-muted mb-3">Score Distribution</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={distributionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#44403C" />
                <XAxis dataKey="range" tick={{ fill: '#8B90A0', fontSize: 9 }} />
                <YAxis allowDecimals={false} tick={{ fill: '#8B90A0', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#292524', border: '1px solid #44403C', borderRadius: '6px', color: '#FAFAF9' }} />
                <Bar dataKey="count" fill="#A78BFA" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Percentile trend */}
          {hasPercentile && (
            <div className="card">
              <h3 className="text-xs font-mono uppercase tracking-wider text-text-muted mb-3">Percentile Trend</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={scoreData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#44403C" />
                  <XAxis dataKey="name" tick={{ fill: '#8B90A0', fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#8B90A0', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#292524', border: '1px solid #44403C', borderRadius: '6px', color: '#FAFAF9' }} />
                  <Line type="monotone" dataKey="percentile" stroke="#22C55E" dot={{ fill: '#22C55E' }} strokeWidth={2} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Test history table */}
      {sorted.length > 0 && (
        <div className="card overflow-x-auto">
          <h3 className="text-xs font-mono uppercase tracking-wider text-text-muted mb-3">Test History</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Date', 'Test Name', 'Score', '%', 'Percentile', 'Platform', 'Actions'].map(h => (
                  <th key={h} className="text-left py-2 px-2 text-text-muted text-xs font-mono">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(t => {
                const pct = t.totalMarks > 0 ? Math.round((t.scored / t.totalMarks) * 100) : 0;
                return (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-surface/50 transition-colors">
                    <td className="py-2 px-2 text-text-muted text-xs font-mono">{formatDate(t.date, 'MMM d')}</td>
                    <td className="py-2 px-2 text-text-primary">{t.testName}</td>
                    <td className="py-2 px-2 font-data text-text-primary">{t.scored}/{t.totalMarks}</td>
                    <td className="py-2 px-2 font-data text-accent-blue">{pct}%</td>
                    <td className="py-2 px-2 font-data text-text-muted">{t.percentile ?? '—'}</td>
                    <td className="py-2 px-2 text-text-secondary text-xs">{t.platform}</td>
                    <td className="py-2 px-2">
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(t)} className="text-accent-blue text-xs hover:underline">Edit</button>
                        <button onClick={() => handleDelete(t.id)} className="text-accent-red text-xs hover:underline">Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
