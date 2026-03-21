// src/pages/SubjectDetailPage.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { useSubjectsStore } from '../stores/useSubjectsStore';
import { useUIStore } from '../stores/useUIStore';
import { nanoid } from '../utils/nanoid';
import { formatDate, todayISO, addDaysToISO, estimateEndDate, isPastISO, isTodayISO } from '../utils/dateUtils';

function SectionHeader({ children }) {
  return <h2 className="text-xs font-mono uppercase tracking-wider text-text-muted mb-3 pb-2 border-b border-border">{children}</h2>;
}

function UnitRow({ unit, subjectId, onMarkDone }) {
  const today = todayISO();
  const isPast = unit.plannedDate && isPastISO(unit.plannedDate);
  const isToday = unit.plannedDate && isTodayISO(unit.plannedDate);
  const isMissed = isPast && !unit.done;

  return (
    <div className={`flex items-center gap-3 py-3 border-b border-border/50 last:border-0 ${isMissed ? 'opacity-60' : ''}`}>
      <button
        onClick={() => !unit.done && !isMissed && onMarkDone(unit.id)}
        disabled={unit.done || isMissed}
        className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
          unit.done ? 'bg-accent-green border-accent-green text-white' :
          isMissed ? 'border-accent-red/50 cursor-not-allowed' :
          'border-border hover:border-accent-blue cursor-pointer'
        }`}
      >
        {unit.done && <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm ${unit.done ? 'text-text-secondary line-through' : 'text-text-primary'}`}>
            {unit.name || `Unit ${unit.id}`}
          </span>
          {isMissed && <span className="text-accent-red text-xs font-mono">Missed</span>}
          {isToday && !unit.done && <span className="text-accent-orange text-xs font-mono">Today</span>}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-text-muted text-xs">{unit.totalTopics || 0} topics</span>
          <span className="text-text-muted text-xs">{unit.lecturesNeeded || 0} lectures</span>
          {unit.plannedDate && !unit.done && (
            <span className="text-text-muted text-xs">{formatDate(unit.plannedDate)}</span>
          )}
          {unit.done && unit.doneOn && (
            <span className="text-accent-green text-xs">Done {formatDate(unit.doneOn, 'MMM d')}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SubjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { uid } = useAuthStore();
  const subject = useSubjectsStore(s => s.subjects[id]);
  const updateSubject = useSubjectsStore(s => s.updateSubject);
  const markUnitDone = useSubjectsStore(s => s.markUnitDone);
  const markRevisionDone = useSubjectsStore(s => s.markRevisionDone);
  const deleteSubject = useSubjectsStore(s => s.deleteSubject);
  const showToast = useUIStore(s => s.showToast);

  const [editing, setEditing] = useState({});
  const [localNotes, setLocalNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newUnit, setNewUnit] = useState({ name: '', totalTopics: 0, lecturesNeeded: 0 });
  const [showAddUnit, setShowAddUnit] = useState(false);
  const notesTimer = useRef(null);

  useEffect(() => {
    if (subject) setLocalNotes(subject.notes || '');
  }, [subject?.id]);

  if (!subject) {
    return (
      <div className="text-center py-16">
        <p className="text-text-muted text-sm">Subject not found.</p>
        <Link to="/subjects" className="text-accent-blue text-sm mt-2 inline-block">← Back to Subjects</Link>
      </div>
    );
  }

  const handleFieldUpdate = async (field, value) => {
    setSaving(true);
    const updates = { [field]: value };
    // Auto-recalc end date
    if (['lecturesPerDay', 'plannedStartDate', 'units'].includes(field)) {
      const units = field === 'units' ? value : (subject.units || []);
      const totalLectures = units.reduce((s, u) => s + (u.lecturesNeeded || 0), 0);
      const lpd = field === 'lecturesPerDay' ? value : subject.lecturesPerDay;
      const startDate = field === 'plannedStartDate' ? value : subject.plannedStartDate;
      if (startDate && lpd > 0) {
        updates.plannedEndDate = addDaysToISO(startDate, Math.ceil(totalLectures / lpd));
      }
    }
    await updateSubject(uid, id, updates);
    setSaving(false);
  };

  const handleNotesChange = (val) => {
    setLocalNotes(val);
    clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => {
      updateSubject(uid, id, { notes: val });
    }, 1500);
  };

  const handleMarkUnitDone = async (unitId) => {
    const result = await markUnitDone(uid, id, unitId);
    if (result.success) showToast('Unit marked as done.', 'success');
    else showToast(result.message || 'Cannot mark unit done.', 'error', 7000);
  };

  const handleMarkRevisionDone = async (revId) => {
    const result = await markRevisionDone(uid, id, revId);
    if (result.success) showToast('Revision marked as done.', 'success');
    else showToast(result.message || 'Cannot mark revision done.', 'error', 7000);
  };

  const handleAddUnit = async () => {
    if (!newUnit.name.trim()) return;
    const unit = { id: nanoid(), ...newUnit, done: false, doneOn: null, plannedDate: null };
    const units = [...(subject.units || []), unit];
    await handleFieldUpdate('units', units);
    setNewUnit({ name: '', totalTopics: 0, lecturesNeeded: 0 });
    setShowAddUnit(false);
    showToast('Unit added.', 'success');
  };

  const handleAddRevision = async () => {
    const rev = { id: nanoid(), plannedDate: null, done: false, doneOn: null, notes: '' };
    await updateSubject(uid, id, { revisionSessions: [...(subject.revisionSessions || []), rev] });
  };

  const handleDelete = async () => {
    await deleteSubject(uid, id);
    navigate('/subjects');
  };

  const units = subject.units || [];
  const doneUnits = units.filter(u => u.done).length;
  const progress = units.length > 0 ? Math.round((doneUnits / units.length) * 100) : 0;
  const totalLectures = units.reduce((s, u) => s + (u.lecturesNeeded || 0), 0);
  const lpd = subject.lecturesPerDay || 1;
  const estDays = lpd > 0 ? Math.ceil(totalLectures / lpd) : 0;

  // Stats calculations
  const daysSinceStart = subject.plannedStartDate
    ? Math.max(0, Math.floor((new Date() - new Date(subject.plannedStartDate)) / 86400000))
    : null;
  const actualRate = daysSinceStart > 0 ? (doneUnits / daysSinceStart).toFixed(2) : null;

  const STATUS_COLOR = {
    not_started: 'text-text-muted',
    in_progress: 'text-accent-blue',
    completed: 'text-accent-green',
    overdue: 'text-accent-orange',
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/subjects" className="text-text-muted hover:text-text-primary transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: subject.color }} />
        <h1 className="text-xl font-medium text-text-primary font-mono flex-1">{subject.name}</h1>
        <span className={`text-sm font-mono ${STATUS_COLOR[subject.status] || 'text-text-muted'}`}>
          {subject.status?.replace('_', ' ')}
        </span>
      </div>

      {/* Progress header */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-text-secondary text-sm">{doneUnits}/{units.length} units complete</span>
          <span className="text-text-primary font-data text-lg font-medium">{progress}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%`, background: subject.color }} />
        </div>
        {estDays > 0 && (
          <p className="text-text-muted text-xs mt-2 font-mono">
            At {lpd} lecture{lpd > 1 ? 's' : ''}/day, this subject takes approximately {estDays} days.
          </p>
        )}
      </div>

      {/* Section A — Setup */}
      <div className="card mb-4">
        <SectionHeader>Setup</SectionHeader>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Total Units', field: 'totalUnits', type: 'number' },
            { label: 'Lectures Per Day', field: 'lecturesPerDay', type: 'number' },
            { label: 'PYQ Days Planned', field: 'pyqDaysPlanned', type: 'number' },
            { label: 'Subject Tests Planned', field: 'testDaysPlanned', type: 'number' },
            { label: 'Revision Days Planned', field: 'revisionDaysPlanned', type: 'number' },
            { label: 'GATE Weightage %', field: 'gateWeightage', type: 'number' },
          ].map(({ label, field, type }) => (
            <div key={field}>
              <label className="label">{label}</label>
              <input
                type={type}
                defaultValue={subject[field] || 0}
                onBlur={e => handleFieldUpdate(field, type === 'number' ? parseInt(e.target.value) || 0 : e.target.value)}
                className="input"
              />
            </div>
          ))}
          <div>
            <label className="label">Planned Start Date</label>
            <input type="date" defaultValue={subject.plannedStartDate || ''} onBlur={e => handleFieldUpdate('plannedStartDate', e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Planned End Date</label>
            <input type="date" defaultValue={subject.plannedEndDate || ''} onBlur={e => handleFieldUpdate('plannedEndDate', e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Color</label>
            <input
              type="color"
              defaultValue={subject.color}
              onBlur={e => handleFieldUpdate('color', e.target.value)}
              className="w-10 h-9 rounded-md border border-border bg-bg cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Section B — Units */}
      <div className="card mb-4">
        <SectionHeader>Units</SectionHeader>
        {units.length === 0 && (
          <p className="text-text-muted text-sm text-center py-4">No units added. Click "+ Add Unit" to start.</p>
        )}
        {units.map((unit) => (
          <UnitRow key={unit.id} unit={unit} subjectId={id} onMarkDone={handleMarkUnitDone} />
        ))}

        {showAddUnit ? (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="col-span-3">
                <label className="label">Unit Name</label>
                <input value={newUnit.name} onChange={e => setNewUnit(u => ({ ...u, name: e.target.value }))} placeholder="e.g. ER Model & Relational Model" className="input" />
              </div>
              <div>
                <label className="label">Total Topics</label>
                <input type="number" value={newUnit.totalTopics} onChange={e => setNewUnit(u => ({ ...u, totalTopics: parseInt(e.target.value) || 0 }))} className="input" />
              </div>
              <div>
                <label className="label">Lectures Needed</label>
                <input type="number" value={newUnit.lecturesNeeded} onChange={e => setNewUnit(u => ({ ...u, lecturesNeeded: parseInt(e.target.value) || 0 }))} className="input" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddUnit} className="btn-primary text-sm">Add Unit</button>
              <button onClick={() => setShowAddUnit(false)} className="btn-secondary text-sm">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAddUnit(true)} className="mt-3 text-accent-blue text-sm hover:text-accent-blue/80 transition-colors">+ Add Unit</button>
        )}
      </div>

      {/* Section C — Revision Tracker */}
      <div className="card mb-4">
        <SectionHeader>Revision Tracker</SectionHeader>
        {(subject.revisionSessions || []).length === 0 && (
          <p className="text-text-muted text-sm mb-3">No revision sessions planned.</p>
        )}
        {(subject.revisionSessions || []).map((rev, i) => {
          const today = todayISO();
          const isPast = rev.plannedDate && rev.plannedDate < today;
          const isMissed = isPast && !rev.done;
          const isToday = rev.plannedDate && rev.plannedDate === today;
          return (
            <div key={rev.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
              <span className="text-text-muted text-xs font-mono w-20 shrink-0">Revision {i + 1}</span>
              <input
                type="date"
                value={rev.plannedDate || ''}
                onChange={async e => {
                  const sessions = subject.revisionSessions.map(r => r.id === rev.id ? { ...r, plannedDate: e.target.value } : r);
                  await updateSubject(uid, id, { revisionSessions: sessions });
                }}
                className="input w-36"
              />
              {isMissed && <span className="text-accent-red text-xs font-mono">Missed</span>}
              {isToday && !rev.done && (
                <button onClick={() => handleMarkRevisionDone(rev.id)} className="text-xs text-accent-blue hover:text-accent-blue/80">Mark Done Today</button>
              )}
              {rev.done && <span className="text-accent-green text-xs font-mono">Done {formatDate(rev.doneOn, 'MMM d')}</span>}
              {!isMissed && !rev.done && !isToday && <span className="text-text-muted text-xs">Upcoming</span>}
            </div>
          );
        })}
        <button onClick={handleAddRevision} className="mt-3 text-accent-blue text-sm hover:text-accent-blue/80 transition-colors">+ Add Revision Date</button>
      </div>

      {/* Section D — Notes */}
      <div className="card mb-4">
        <SectionHeader>Notes</SectionHeader>
        <textarea
          value={localNotes}
          onChange={e => handleNotesChange(e.target.value)}
          placeholder="Free-form notes about this subject..."
          rows={4}
          className="input w-full resize-none"
        />
        <div className="text-text-muted text-xs mt-1 font-mono">Auto-saves as you type</div>
      </div>

      {/* Section E — Stats */}
      <div className="card mb-6">
        <SectionHeader>Stats</SectionHeader>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {daysSinceStart !== null && (
            <div>
              <div className="label">Days Since Started</div>
              <div className="text-text-primary font-data">{daysSinceStart}</div>
            </div>
          )}
          {actualRate !== null && (
            <div>
              <div className="label">Actual Units/Day Rate</div>
              <div className="text-text-primary font-data">{actualRate}</div>
            </div>
          )}
          {subject.plannedEndDate && (
            <div>
              <div className="label">Planned End Date</div>
              <div className="text-text-primary">{formatDate(subject.plannedEndDate)}</div>
            </div>
          )}
          <div>
            <div className="label">Revisions Done / Planned</div>
            <div className="text-text-primary font-data">
              {(subject.revisionSessions || []).filter(r => r.done).length} / {(subject.revisionSessions || []).length}
            </div>
          </div>
        </div>
        {subject.plannedEndDate && actualRate && doneUnits < units.length && (
          <div className="mt-3 text-xs text-accent-orange font-mono">
            {(() => {
              const remaining = units.length - doneUnits;
              const daysNeeded = Math.ceil(remaining / parseFloat(actualRate));
              const projectedEnd = addDaysToISO(todayISO(), daysNeeded);
              const diff = Math.ceil((new Date(projectedEnd) - new Date(subject.plannedEndDate)) / 86400000);
              if (diff > 0) return `At current pace, you'll finish ~${diff} days late.`;
              if (diff < 0) return `At current pace, you're ahead by ~${Math.abs(diff)} days.`;
              return 'On track!';
            })()}
          </div>
        )}
      </div>

      {/* Delete */}
      <div className="card border-accent-red/20">
        <h3 className="text-sm font-mono text-accent-red mb-3">Delete Subject</h3>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} className="btn-danger text-sm">Delete Subject</button>
        ) : (
          <div className="flex gap-3">
            <button onClick={handleDelete} className="btn-danger text-sm">Yes, Delete</button>
            <button onClick={() => setConfirmDelete(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}
