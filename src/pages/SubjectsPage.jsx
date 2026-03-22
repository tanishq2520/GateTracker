// src/pages/SubjectsPage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { useSubjectsStore, DEFAULT_SUBJECTS } from '../stores/useSubjectsStore';
import { useUIStore } from '../stores/useUIStore';
import { formatDate, todayISO } from '../utils/dateUtils';
import { nanoid } from '../utils/nanoid';

const STATUS_BADGE = {
  not_started: 'bg-text-muted/10 text-text-muted border-text-muted/20',
  in_progress: 'bg-accent-blue/10 text-accent-blue border-accent-blue/20',
  completed: 'bg-accent-green/10 text-accent-green border-accent-green/20',
  overdue: 'bg-accent-orange/10 text-accent-orange border-accent-orange/20',
};

const STATUS_LABEL = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  overdue: 'Overdue',
};

function getSubjectStatus(subject) {
  const today = todayISO();
  if (subject.status === 'completed') return 'completed';
  if (subject.status === 'in_progress' && subject.plannedEndDate && subject.plannedEndDate < today) return 'overdue';
  return subject.status || 'not_started';
}

function getProgress(subject) {
  const units = subject.units || [];
  if (units.length === 0) return { percent: 0, done: 0, total: 0 };
  const done = units.filter(u => u.done).length;
  return { percent: Math.round((done / units.length) * 100), done, total: units.length };
}

function SubjectCard({ subject }) {
  const progress = getProgress(subject);
  const statusKey = getSubjectStatus(subject);
  const statusColors = {
    not_started: 'rgba(255,255,255,0.28)',
    in_progress: '#A78BFA',
    completed: '#34D399',
    overdue: '#F97316',
  };
  return (
    <div className="liquid-glass" style={{ borderRadius: 16, padding: '18px 20px', transition: 'filter 0.2s' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: subject.color }} />
          <h3 style={{ color: 'rgba(255,255,255,0.9)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500 }}>{subject.name}</h3>
        </div>
        <span style={{ fontSize: 10, color: statusColors[statusKey], fontFamily: 'var(--font-body)', background: `${statusColors[statusKey]}18`, padding: '3px 8px', borderRadius: 9999 }}>
          {STATUS_LABEL[statusKey]}
        </span>
      </div>

      <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 9999, overflow: 'hidden', marginBottom: 6 }}>
        <div style={{ height: '100%', width: `${progress.percent}%`, background: subject.color, borderRadius: 9999 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', marginBottom: 12 }}>
        <span>{progress.done}/{progress.total} units</span>
        <span>{progress.percent}%</span>
      </div>

      {subject.plannedEndDate && (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8, fontFamily: 'var(--font-body)' }}>
          Planned end: {formatDate(subject.plannedEndDate)}
        </div>
      )}

      {(() => {
        const upcoming = (subject.revisionSessions || []).find(r => !r.done && r.plannedDate);
        return upcoming ? (
          <div style={{ fontSize: 11, color: '#A78BFA', marginBottom: 8, fontFamily: 'var(--font-body)' }}>Next revision: {formatDate(upcoming.plannedDate)}</div>
        ) : null;
      })()}

      <Link to={`/subjects/${subject.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, fontSize: 12, color: '#F97316', textDecoration: 'none', marginTop: 8 }}>
        Open <svg style={{ width: 12, height: 12 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
      </Link>
    </div>
  );
}

function UnconfiguredCard({ name, color, onAdd }) {
  return (
    <div
      className="liquid-glass"
      style={{ borderRadius: 16, padding: '16px 18px', opacity: 0.6, cursor: 'pointer', transition: 'opacity 0.2s' }}
      onClick={onAdd}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
        <h3 style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-body)', fontSize: 13 }}>{name}</h3>
      </div>
      <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 11, fontFamily: 'var(--font-body)' }}>Not configured. Click to add.</p>
    </div>
  );
}

export default function SubjectsPage() {
  const { uid } = useAuthStore();
  const subjects = useSubjectsStore(s => s.subjects);
  const addSubject = useSubjectsStore(s => s.addSubject);
  const showToast = useUIStore(s => s.showToast);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#4F8EF7');
  const [saving, setSaving] = useState(false);

  const configuredSubjects = Object.values(subjects);
  const configuredNames = new Set(configuredSubjects.map(s => s.name.toLowerCase()));

  const handleAddDefault = async (name, color) => {
    setSaving(true);
    const id = await addSubject(uid, { name, color });
    showToast(`"${name}" added. Open it to configure units and dates.`, 'success');
    setSaving(false);
  };

  const handleAddCustom = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    await addSubject(uid, { name: newName.trim(), color: newColor });
    showToast(`"${newName}" added.`, 'success');
    setNewName(''); setShowAddForm(false);
    setSaving(false);
  };

  const unconfigured = DEFAULT_SUBJECTS.filter(s => !configuredNames.has(s.name.toLowerCase()));

  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'rgba(255,255,255,0.9)', letterSpacing: '-0.02em' }}>Subjects</h1>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, fontFamily: 'var(--font-body)', marginTop: 4 }}>
            {configuredSubjects.length === 0
              ? 'No subjects configured yet.'
              : `${configuredSubjects.length} subject${configuredSubjects.length > 1 ? 's' : ''} configured`}
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{ background: 'rgba(249,115,22,0.85)', backdropFilter: 'blur(8px)', color: '#fff', border: '1px solid rgba(249,115,22,0.4)', borderRadius: 8, padding: '8px 16px', fontFamily: 'var(--font-body)', fontSize: 13, cursor: 'pointer' }}
        >
          + Custom Subject
        </button>
      </div>

      {showAddForm && (
        <div className="liquid-glass" style={{ borderRadius: 16, padding: '20px', marginBottom: 24 }}>
          <h3 style={{ fontSize: 13, fontFamily: 'var(--font-body)', fontWeight: 500, color: 'rgba(255,255,255,0.9)', marginBottom: 16 }}>Add Custom Subject</h3>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontFamily: 'var(--font-body)' }}>Subject Name</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. VLSI Design" style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)', borderRadius: 8, padding: '8px 12px', fontFamily: 'var(--font-body)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontFamily: 'var(--font-body)' }}>Color</label>
              <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} style={{ width: 40, height: 36, borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', cursor: 'pointer' }} />
            </div>
            <button onClick={handleAddCustom} disabled={!newName.trim() || saving} style={{ background: 'rgba(249,115,22,0.85)', color: '#fff', border: '1px solid rgba(249,115,22,0.4)', borderRadius: 8, padding: '8px 16px', fontFamily: 'var(--font-body)', fontSize: 13, cursor: 'pointer' }}>Add</button>
            <button onClick={() => setShowAddForm(false)} className="liquid-glass" style={{ color: 'rgba(255,255,255,0.6)', border: 'none', borderRadius: 8, padding: '8px 16px', fontFamily: 'var(--font-body)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {configuredSubjects.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16 }}>Configured ({configuredSubjects.length})</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {configuredSubjects.map(s => <SubjectCard key={s.id} subject={s} />)}
          </div>
        </div>
      )}

      {unconfigured.length > 0 && (
        <div>
          <h2 style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16 }}>
            Add from GATE CS syllabus ({unconfigured.length} remaining)
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {unconfigured.map(s => (
              <UnconfiguredCard key={s.name} name={s.name} color={s.color} onAdd={() => handleAddDefault(s.name, s.color)} />
            ))}
          </div>
        </div>
      )}

      {configuredSubjects.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: 13, maxWidth: 360, margin: '0 auto', fontFamily: 'var(--font-body)' }}>
            <p style={{ marginBottom: 8 }}>No subjects set up.</p>
            <p>Click a subject above to add it, or use "+ Custom Subject" to add your own.</p>
            <p style={{ marginTop: 8, color: 'rgba(255,255,255,0.18)' }}>Set its units, lectures per day, and target dates.</p>
          </div>
        </div>
      )}
    </div>
  );
}
