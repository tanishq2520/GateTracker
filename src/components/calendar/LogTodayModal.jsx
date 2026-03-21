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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card max-w-lg w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div>
            <h3 className="text-sm font-mono font-medium text-text-primary uppercase tracking-wider">Today's Tasks</h3>
            <p className="text-text-muted text-xs mt-1">
              {totalCompleted} / {totalPlanned} hrs done
            </p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary px-2 py-1">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {/* Tasks List */}
          <div>
            <h4 className="label mb-2">Tasks ({tasks.length})</h4>
            {tasks.length === 0 ? (
              <p className="text-text-muted text-xs italic mb-4">No tasks added for today yet.</p>
            ) : (
              <div className="space-y-2 mb-4">
                {tasks.map(t => (
                  <div key={t.id} className={`flex items-start gap-3 p-3 rounded-md border ${t.done ? 'border-accent-green/30 bg-accent-green/5 opacity-70' : 'border-border bg-bg/50'}`}>
                    <button 
                      onClick={() => markDoneAction(uid, today, t.id, !t.done)}
                      title={t.done ? 'Mark as not done' : 'Mark as done'}
                      className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${t.done ? 'bg-accent-green border-accent-green' : 'border-text-secondary hover:border-accent-green'}`}
                    >
                      {t.done ? (
                        <svg className="w-3 h-3 text-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <span className="text-[10px] leading-none font-bold text-accent-red">x</span>
                      )}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm ${t.done ? 'text-text-muted line-through' : 'text-text-primary'}`}>{t.description}</div>
                      <div className="flex items-center gap-2 mt-1">
                        {t.subjectId && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded border border-border" style={{ color: getSubjectColor(t.subjectId) }}>
                            {getSubjectName(t.subjectId)}
                          </span>
                        )}
                        <span className="text-text-muted text-[10px] font-mono">{t.estimatedHours} hrs</span>
                      </div>
                    </div>

                    {!t.done && (
                      <button onClick={() => removeAction(uid, today, t.id)} className="text-text-muted hover:text-accent-red p-1 shrink-0" title="Remove task">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add Task Form */}
            <form onSubmit={handleAddTask} className="flex flex-col gap-2 p-3 bg-bg/30 rounded-md border border-border border-dashed">
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
