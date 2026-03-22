// src/components/calendar/EventModal.jsx
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useCalendarStore, EVENT_TYPES } from '../../stores/useCalendarStore';
import { useSubjectsStore } from '../../stores/useSubjectsStore';
import { useUIStore } from '../../stores/useUIStore';

const SUBJECT_TYPES = ['study', 'revision', 'subject_test', 'pyq'];
const PLATFORMS = ['GATE Overflow', 'Made Easy', 'TestBook', 'Unacademy', 'NPTEL', 'Self', 'Other'];

export default function EventModal({ date, event, mode, onClose }) {
  const { uid } = useAuthStore();
  const addEvent = useCalendarStore(s => s.addEvent);
  const updateEvent = useCalendarStore(s => s.updateEvent);
  const deleteEvent = useCalendarStore(s => s.deleteEvent);
  const subjects = useSubjectsStore(s => s.subjects);
  const showToast = useUIStore(s => s.showToast);

  const [form, setForm] = useState({
    type: 'study', subjectId: '', label: '', notes: '', platform: 'GATE Overflow', testName: '',
  });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (event) {
      setForm({ type: event.type || 'study', subjectId: event.subjectId || '', label: event.label || '', notes: event.notes || '', platform: event.platform || 'GATE Overflow', testName: event.testName || '' });
    }
  }, [event?.id]);

  const subjectList = Object.values(subjects);

  const getEventColor = () => {
    if (form.subjectId && subjects[form.subjectId]) return subjects[form.subjectId].color;
    return EVENT_TYPES[form.type]?.color || '#4F8EF7';
  };

  const handleSave = async () => {
    setSaving(true);
    const eventDate = date || event?.date;
    const color = getEventColor();
    const data = {
      date: eventDate,
      type: form.type,
      subjectId: SUBJECT_TYPES.includes(form.type) ? (form.subjectId || null) : null,
      label: form.label || (subjects[form.subjectId]?.name ? `${subjects[form.subjectId].name} — ${EVENT_TYPES[form.type]?.label}` : EVENT_TYPES[form.type]?.label || form.type),
      color,
      notes: form.notes,
      done: false,
      status: 'planned',
      ...(form.type === 'mock_test' ? { platform: form.platform, testName: form.testName } : {}),
    };
    try {
      if (mode === 'edit-event' && event) {
        await updateEvent(uid, event.id, data);
        showToast('Event updated.', 'success');
      } else {
        await addEvent(uid, data);
        showToast('Event added.', 'success');
      }
      onClose();
    } catch (e) {
      showToast('Failed to save event.', 'error');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setSaving(true);
    await deleteEvent(uid, event.id);
    showToast('Event deleted.', 'info');
    onClose();
    setSaving(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={onClose}>
      <div className="liquid-glass-strong" style={{ maxWidth: 448, width: '100%', borderRadius: 16, padding: 24 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
            {mode === 'edit-event' ? 'Edit Event' : 'Add Event'}
          </h3>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>{date || event?.date}</span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Date</label>
            <input type="text" value={date || event?.date || ''} readOnly className="input opacity-60 cursor-not-allowed" />
          </div>

          <div>
            <label className="label">Event Type</label>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(EVENT_TYPES).map(([key, { label }]) => (
                <button
                  key={key}
                  onClick={() => setForm(f => ({ ...f, type: key }))}
                  style={{
                    padding: '4px 10px', borderRadius: 4, fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer', transition: 'all 0.15s',
                    background: form.type === key ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${form.type === key ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.12)'}`,
                    color: form.type === key ? '#F97316' : 'rgba(255,255,255,0.55)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {SUBJECT_TYPES.includes(form.type) && (
            <div>
              <label className="label">Subject</label>
              <select value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))} className="input">
                <option value="">None</option>
                {subjectList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          {form.type === 'mock_test' && (
            <>
              <div>
                <label className="label">Test Name</label>
                <input value={form.testName} onChange={e => setForm(f => ({ ...f, testName: e.target.value }))} placeholder="e.g. Mock Test 4" className="input" />
              </div>
              <div>
                <label className="label">Platform</label>
                <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} className="input">
                  {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </>
          )}

          <div>
            <label className="label">Label</label>
            <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. DBMS — SQL Unit 3" className="input" />
          </div>

          <div>
            <label className="label">Notes (optional)</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="input resize-none" />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-5">
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save'}</button>
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        </div>
        {mode === 'edit-event' && (
          <button onClick={handleDelete} disabled={saving} className="btn-danger w-full mt-2 text-sm">
            {confirmDelete ? 'Click again to confirm deletion' : 'Delete Event'}
          </button>
        )}
      </div>
    </div>
  );
}
