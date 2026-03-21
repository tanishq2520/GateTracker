// src/pages/SubjectsPage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { useSubjectsStore, DEFAULT_SUBJECTS } from '../stores/useSubjectsStore';
import { useUIStore } from '../stores/useUIStore';
import { formatDate } from '../utils/dateUtils';
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
  const today = new Date().toISOString().split('T')[0];
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
  return (
    <div className="card group hover:border-accent-blue/40 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ background: subject.color }} />
          <h3 className="text-text-primary font-medium text-sm">{subject.name}</h3>
        </div>
        <span className={`badge border ${STATUS_BADGE[statusKey]}`}>{STATUS_LABEL[statusKey]}</span>
      </div>

      {/* Progress bar */}
      <div className="progress-bar mb-1">
        <div className="progress-fill" style={{ width: `${progress.percent}%`, background: subject.color }} />
      </div>
      <div className="flex items-center justify-between text-xs text-text-muted font-data mb-3">
        <span>{progress.done}/{progress.total} units</span>
        <span>{progress.percent}%</span>
      </div>

      {subject.plannedEndDate && (
        <div className="text-xs text-text-muted mb-3">
          Planned end: {formatDate(subject.plannedEndDate)}
        </div>
      )}

      {/* Next revision */}
      {(() => {
        const upcoming = (subject.revisionSessions || []).find(r => !r.done && r.plannedDate);
        return upcoming ? (
          <div className="text-xs text-accent-purple mb-3">Next revision: {formatDate(upcoming.plannedDate)}</div>
        ) : null;
      })()}

      <Link to={`/subjects/${subject.id}`} className="flex items-center justify-end gap-1 text-xs text-accent-blue hover:text-accent-blue/80 transition-colors mt-2">
        Open <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
      </Link>
    </div>
  );
}

function UnconfiguredCard({ name, color, onAdd }) {
  return (
    <div className="card border-dashed opacity-50 hover:opacity-80 transition-opacity cursor-pointer" onClick={onAdd}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full" style={{ background: color }} />
        <h3 className="text-text-secondary text-sm">{name}</h3>
      </div>
      <p className="text-text-muted text-xs">Not configured. Click to add.</p>
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium text-text-primary font-mono">Subjects</h1>
          <p className="text-text-muted text-sm mt-0.5">
            {configuredSubjects.length === 0
              ? 'No subjects configured yet.'
              : `${configuredSubjects.length} subject${configuredSubjects.length > 1 ? 's' : ''} configured`}
          </p>
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)} className="btn-secondary text-sm">
          + Custom Subject
        </button>
      </div>

      {/* Custom add form */}
      {showAddForm && (
        <div className="card mb-6">
          <h3 className="text-sm font-mono font-medium text-text-primary mb-4">Add Custom Subject</h3>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="label">Subject Name</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. VLSI Design" className="input" />
            </div>
            <div>
              <label className="label">Color</label>
              <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} className="w-10 h-9 rounded-md border border-border bg-bg cursor-pointer" />
            </div>
            <button onClick={handleAddCustom} disabled={!newName.trim() || saving} className="btn-primary">Add</button>
            <button onClick={() => setShowAddForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Configured subjects */}
      {configuredSubjects.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-mono uppercase tracking-wider text-text-muted mb-3">Configured ({configuredSubjects.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {configuredSubjects.map(s => <SubjectCard key={s.id} subject={s} />)}
          </div>
        </div>
      )}

      {/* Unconfigured pre-loaded subjects */}
      {unconfigured.length > 0 && (
        <div>
          <h2 className="text-xs font-mono uppercase tracking-wider text-text-muted mb-3">
            Add from GATE CS syllabus ({unconfigured.length} remaining)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {unconfigured.map(s => (
              <UnconfiguredCard key={s.name} name={s.name} color={s.color} onAdd={() => handleAddDefault(s.name, s.color)} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {configuredSubjects.length === 0 && (
        <div className="text-center py-16">
          <div className="text-text-muted text-sm max-w-sm mx-auto">
            <p className="mb-2">No subjects set up.</p>
            <p>Click a subject above to add it, or use "+ Custom Subject" to add your own.</p>
            <p className="mt-2 text-text-muted/60">Set its units, lectures per day, and target dates.</p>
          </div>
        </div>
      )}
    </div>
  );
}
