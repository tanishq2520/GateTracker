// src/components/calendar/LogTodayModal.jsx
import React, { useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useDailyLogStore } from '../../stores/useDailyLogStore';
import { useSubjectsStore } from '../../stores/useSubjectsStore';
import { todayISO } from '../../utils/dateUtils';
import { nanoid } from 'nanoid';

export default function LogTodayModal({ onClose }) {
  const { uid } = useAuthStore();
  const today = todayISO();
  
  const todayLog = useDailyLogStore(s => s.getTodayLog());
  const addAction = useDailyLogStore(s => s.addTask);
  const removeAction = useDailyLogStore(s => s.removeTask);
  const markDoneAction = useDailyLogStore(s => s.markTaskDone);
  const updateNotesAction = useDailyLogStore(s => s.updateNotes);

  const subjects = useSubjectsStore(s => s.subjects);
  
  const [newTask, setNewTask] = useState({ description: '', subjectId: '', estimatedHours: '' });
  const [notes, setNotes] = useState(todayLog?.notes || '');
  const [adding, setAdding] = useState(false);

  const tasks = todayLog?.tasks || [];
  const totalPlanned = todayLog?.totalPlannedHours || 0;
  const totalCompleted = todayLog?.totalCompletedHours || 0;

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.description || !newTask.estimatedHours) return;
    setAdding(true);
    await addAction(uid, today, {
      id: nanoid(),
      description: newTask.description,
      subjectId: newTask.subjectId,
      estimatedHours: parseFloat(newTask.estimatedHours) || 0,
      done: false,
      doneAt: null
    });
    setNewTask({ description: '', subjectId: newTask.subjectId, estimatedHours: '' });
    setAdding(false);
  };

  const handleNotesBlur = () => {
    if (notes !== (todayLog?.notes || '')) {
      updateNotesAction(uid, today, notes);
    }
  };

  const getSubjectColor = (id) => subjects[id]?.color || '#57534E';
  const getSubjectName = (id) => subjects[id]?.name.split(' ')[0] || 'General';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={onClose}>
      <div className="liquid-glass-strong" style={{ maxWidth: 512, width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', borderRadius: 16, padding: 24 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div>
            <h3 style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>Today's Tasks</h3>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4 }}>
              {totalCompleted} / {totalPlanned} hrs done
            </p>
          </div>
          <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', fontSize: 16 }}>✕</button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {/* Tasks List */}
          <div>
            <h4 className="label mb-2">Tasks ({tasks.length})</h4>
            {tasks.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontStyle: 'italic', marginBottom: 16 }}>No tasks added for today yet.</p>
            ) : (
              <div className="space-y-2 mb-4">
                {tasks.map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 12, borderRadius: 8, border: `1px solid ${t.done ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.08)'}`, background: t.done ? 'rgba(52,211,153,0.05)' : 'rgba(255,255,255,0.04)', opacity: t.done ? 0.7 : 1 }}>
                    <button 
                      onClick={() => markDoneAction(uid, today, t.id, !t.done)}
                      title={t.done ? 'Mark as not done' : 'Mark as done'}
                      style={{ marginTop: 2, width: 16, height: 16, borderRadius: 3, border: `1px solid ${t.done ? '#34D399' : 'rgba(255,255,255,0.3)'}`, background: t.done ? '#34D399' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}
                    >
                      {t.done ? (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="#1C1917" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <span style={{ fontSize: 10, lineHeight: 1, fontWeight: 700, color: '#F87171' }}>x</span>
                      )}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <div style={{ fontSize: 13, color: t.done ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.9)', textDecoration: t.done ? 'line-through' : 'none' }}>{t.description}</div>
                      <div className="flex items-center gap-2 mt-1">
                        {t.subjectId && (
                          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, border: '1px solid rgba(255,255,255,0.1)', color: getSubjectColor(t.subjectId) }}>
                            {getSubjectName(t.subjectId)}
                          </span>
                        )}
                        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontFamily: 'var(--font-mono)' }}>{t.estimatedHours} hrs</span>
                      </div>
                    </div>

                    {!t.done && (
                      <button onClick={() => removeAction(uid, today, t.id)} style={{ color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }} title="Remove task">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add Task Form */}
            <form onSubmit={handleAddTask} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px dashed rgba(255,255,255,0.12)' }}>
              <input
                type="text"
                placeholder="Task description (e.g. Revise OS Unit 3)"
                value={newTask.description}
                onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                className="input"
                required
              />
              <div className="flex gap-2">
                <select
                  value={newTask.subjectId}
                  onChange={e => setNewTask({ ...newTask, subjectId: e.target.value })}
                  className="input flex-1"
                >
                  <option value="">No Subject</option>
                  {Object.values(subjects).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.5"
                  min="0.1"
                  placeholder="Hrs"
                  value={newTask.estimatedHours}
                  onChange={e => setNewTask({ ...newTask, estimatedHours: e.target.value })}
                  className="input w-24 text-center"
                  required
                />
              </div>
              <button type="submit" disabled={adding || !newTask.description || !newTask.estimatedHours} className="btn-secondary w-full py-1.5 justify-center mt-1">
                + Add Task
              </button>
            </form>
          </div>

          {/* Notes */}
          <div>
            <label className="label mb-2">Daily Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              rows={3}
              placeholder="Record observations, focus levels, etc. (Auto-saves on blur)"
              className="input resize-none w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
