// src/components/calendar/DayDetailPanel.jsx
// Local-first, onSnapshot-driven day panel.
// Shows ONLY tasks — no "Calendar Events" section.
// All mutations update local state instantly; Firestore writes run in background.

import React, { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, query, setDoc, where, deleteDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuthStore } from '../../stores/useAuthStore';
import { useGoalsStore } from '../../stores/useGoalsStore';
import { useCalendarStore, EVENT_TYPES } from '../../stores/useCalendarStore';
import { useSubjectsStore } from '../../stores/useSubjectsStore';
import { useUIStore } from '../../stores/useUIStore';
import { todayISO, toISODateString } from '../../utils/dateUtils';
import { calendarRef } from '../../firebase/firestore';

const DAY_TYPE_ORDER = ['study', 'revision', 'mock_test', 'subject_test', 'pyq', 'sem_exam', 'leave', 'buffer'];
const SHIFT_TRIGGER_TYPES = new Set(['leave', 'sem_exam']);

export default function DayDetailPanel({ date, onClose }) {
  const { uid }   = useAuthStore();
  const gateExamDate = useGoalsStore(s => s.goals.gateExamDate);
  const upsertEvent = useCalendarStore(s => s.upsertEvent);
  const cascadeShift = useCalendarStore(s => s.cascadeShift);
  const subjects  = useSubjectsStore(s => s.subjects);
  const showToast = useUIStore(s => s.showToast);

  const dateKey = toISODateString(date);
  const today    = todayISO();
  const isToday  = dateKey === today;
  const isPast   = dateKey < today;
  const canEdit  = !isPast; // today + future are editable

  // ── LOCAL STATE IS THE SOURCE OF TRUTH FOR THE UI ────────────
  const [tasks,   setTasks]   = useState([]);
  const [loaded,  setLoaded]  = useState(false);
  const [editId,  setEditId]  = useState(null);
  const [editVals,setEditVals]= useState({});
  const [form,    setForm]    = useState({ description:'', subjectId:'', estimatedHours:'' });
  const [confirm, setConfirm] = useState(false); // erase-all confirm state
  const [dayType, setDayType] = useState(null);

  // Keep a ref so the background save never captures a stale uid/date
  const ctxRef = useRef({ uid, date: dateKey });
  const logExistsRef = useRef(false);
  const explicitDayTypeRef = useRef(null);
  useEffect(() => { ctxRef.current = { uid, date: dateKey }; }, [uid, dateKey]);

  // ── REAL-TIME LISTENER ────────────────────────────────────────
  useEffect(() => {
    if (!uid || !dateKey) return;
    setLoaded(false);
    logExistsRef.current = false;
    explicitDayTypeRef.current = null;

    const ref = doc(db, `users/${uid}/dailyLogs/${dateKey}`);
    const unsubLog = onSnapshot(ref, snap => {
      logExistsRef.current = snap.exists();
      if (snap.exists()) {
        const nextTasks = snap.data().tasks || [];
        const nextDayType = snap.data().dayType || (nextTasks.length > 0 ? 'study' : null);
        explicitDayTypeRef.current = snap.data().dayType || null;
        setTasks(nextTasks);
        setDayType(nextDayType);
        setLoaded(true);
      }
    }, err => {
      console.error('DayDetailPanel snapshot error', err);
      setLoaded(true);
    });

    const eventQuery = query(calendarRef(uid), where('date', '==', dateKey));
    const unsubEvents = onSnapshot(eventQuery, snapshot => {
      if (logExistsRef.current) {
        setLoaded(true);
        return;
      }

      const fallbackTasks = snapshot.docs.flatMap((docSnap) => {
        const event = docSnap.data();
        return (event.tasks || []).map(task => ({
          id: task.id || crypto.randomUUID(),
          description: task.description,
          subjectId: task.subjectId ?? event.subjectId ?? null,
          estimatedHours: Number(task.estimatedHours) || 0,
          done: Boolean(task.done),
          doneAt: task.doneAt ?? null,
        }));
      });
      const fallbackDayTypeEvent = snapshot.docs
        .map((docSnap) => docSnap.data())
        .find(event => event.source === 'day_type');
      const fallbackDayType = fallbackDayTypeEvent?.type || (fallbackTasks.length > 0 ? 'study' : null);

      setTasks(fallbackTasks);
      if (!explicitDayTypeRef.current) {
        setDayType(fallbackDayType);
      }
      setLoaded(true);
    }, err => {
      console.error('DayDetailPanel event fallback error', err);
      setLoaded(true);
    });

    return () => {
      unsubLog();
      unsubEvents();
    };
  }, [uid, dateKey]);

  // ── SINGLE BACKGROUND SAVE — never blocks UI ─────────────────
  const persist = (updatedTasks) => {
    const { uid: u, date: d } = ctxRef.current;
    const ref = doc(db, `users/${u}/dailyLogs/${d}`);
    setDoc(ref, {
      date: d,
      tasks: updatedTasks,
      totalPlannedHours:    updatedTasks.reduce((s,t) => s + (Number(t.estimatedHours)||0), 0),
      totalCompletedHours:  updatedTasks.filter(t=>t.done).reduce((s,t) => s + (Number(t.estimatedHours)||0), 0),
    }, { merge: true }).catch(err => {
      console.error('DayDetailPanel save error', err);
      showToast('Sync failed — check connection.', 'error');
    });
  };

  // ── SYNC calendarEvents docs to match remaining tasks ───────
  // calendarEvents use nanoid() as doc ID, date is stored as a field.
  // We must query by date field to find and update/delete the right docs.
  const syncCalendarEvent = async (updatedTasks) => {
    const { uid: u, date: d } = ctxRef.current;
    const q = query(
      collection(db, `users/${u}/calendarEvents`),
      where('date', '==', d)
    );
    try {
      const snap = await getDocs(q);
      const studyDocs = snap.docs.filter(ds => ds.data().source !== 'day_type');
      if (updatedTasks.length === 0) {
        // No tasks left — delete all non-daytype calendarEvent docs for this date
        await Promise.all(studyDocs.map(ds => deleteDoc(ds.ref)));
      } else {
        // Update label/color on the first study event doc to match remaining tasks
        const firstSubjectId = updatedTasks[0]?.subjectId;
        const sub = firstSubjectId ? subjects[firstSubjectId] : null;
        const newLabel = sub?.name || updatedTasks[0]?.description || 'Study';
        const newColor = sub?.color || '#4F8EF7';
        await Promise.all(studyDocs.map(ds =>
          setDoc(ds.ref, { label: newLabel, color: newColor }, { merge: true })
        ));
      }
    } catch (err) {
      console.error('syncCalendarEvent error', err);
    }
  };

  // ── TASK ACTIONS (all update local state immediately) ─────────
  const handleAdd = (e) => {
    e.preventDefault();
    const desc = form.description.trim();
    const hrs  = parseFloat(form.estimatedHours);
    if (!desc || !hrs) return;

    const task = {
      id:             crypto.randomUUID(),
      description:    desc,
      subjectId:      form.subjectId || null,
      estimatedHours: hrs,
      done:   false,
      doneAt: null,
    };
    const updated = [...tasks, task];
    setTasks(updated);                              // instant UI update
    if (!explicitDayTypeRef.current) setDayType('study');
    setForm({ description:'', subjectId: form.subjectId, estimatedHours:'' }); // clear form instantly
    persist(updated);                               // background Firestore write
  };

  const handleRemove = (id) => {
    const updated = tasks.filter(t => t.id !== id);
    setTasks(updated);
    if (!explicitDayTypeRef.current && updated.length === 0) setDayType(null);
    persist(updated);
    syncCalendarEvent(updated);
  };

  const handleToggleDone = (id) => {
    if (!isToday) return; // no backdating
    const updated = tasks.map(t =>
      t.id === id ? { ...t, done: !t.done, doneAt: t.done ? null : new Date().toISOString() } : t
    );
    setTasks(updated);
    persist(updated);
  };

  const handleEraseAll = () => {
    setTasks([]);        // instant UI clear
    setConfirm(false);
    persist([]);         // background save
    syncCalendarEvent([]);  // remove calendarEvents doc so cell goes empty
    onClose();
  };

  const startEdit = (t) => {
    setEditId(t.id);
    setEditVals({ description: t.description, subjectId: t.subjectId||'', estimatedHours: String(t.estimatedHours) });
  };

  const saveEdit = () => {
    const desc = editVals.description.trim();
    const hrs  = parseFloat(editVals.estimatedHours);
    if (!desc || !hrs) return;
    const updated = tasks.map(t =>
      t.id === editId ? { ...t, description: desc, subjectId: editVals.subjectId||null, estimatedHours: hrs } : t
    );
    setTasks(updated);
    setEditId(null);
    if (!explicitDayTypeRef.current && updated.length > 0) setDayType('study');
    persist(updated);
  };

  const handleDayTypeSelect = async (selectedType) => {
    if (!uid || !dateKey) return;

    const fallbackDayType = tasks.length > 0 ? 'study' : null;
    const previousType = dayType || explicitDayTypeRef.current || fallbackDayType;
    const previousTasks = tasks;
    if (selectedType === previousType) return;

    const shouldTriggerShift =
      SHIFT_TRIGGER_TYPES.has(selectedType) &&
      !SHIFT_TRIGGER_TYPES.has(previousType);

    const dayTypeEventId = `daytype-${dateKey}`;

    setDayType(selectedType);
    explicitDayTypeRef.current = selectedType;
    if (shouldTriggerShift) {
      setTasks([]);
    }

    try {
      await setDoc(doc(db, `users/${uid}/dailyLogs/${dateKey}`), {
        date: dateKey,
        dayType: selectedType,
      }, { merge: true });

      await upsertEvent(uid, dayTypeEventId, {
        id: dayTypeEventId,
        date: dateKey,
        type: selectedType,
        color: EVENT_TYPES[selectedType]?.color || EVENT_TYPES.study.color,
        label: EVENT_TYPES[selectedType]?.label || 'Study',
        source: 'day_type',
        done: false,
        status: 'planned',
      });

      if (shouldTriggerShift) {
        await cascadeShift(uid, gateExamDate, dateKey, 1);
      }
    } catch (err) {
      console.error('Day type save error', err);
      setDayType(previousType || null);
      explicitDayTypeRef.current = previousType || null;
      setTasks(previousTasks);
      showToast('Failed to update day type.', 'error');
    }
  };

  // ── HELPERS ───────────────────────────────────────────────────
  const fmt = d => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday:'long', year:'numeric', month:'long', day:'numeric',
  });
  const subColor = id => subjects[id]?.color || '#57534E';
  const subName  = id => subjects[id]?.name  || '';

  const completedHrs = tasks.filter(t=>t.done).reduce((s,t)=>s+t.estimatedHours,0);
  const plannedHrs   = tasks.reduce((s,t)=>s+t.estimatedHours,0);

  // ── STYLES ────────────────────────────────────────────────────
  const S = {
    overlay: { position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',WebkitBackdropFilter:'blur(4px)',zIndex:50,display:'flex',alignItems:'flex-start',justifyContent:'flex-end' },
    panel:   { width:400,height:'100%',background:'rgba(255,255,255,0.06)',backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)',boxShadow:'inset 0 1px 1px rgba(255,255,255,0.1)',borderLeft:'1px solid rgba(255,255,255,0.08)',display:'flex',flexDirection:'column',overflowY:'auto' },
    hdr:     { padding:'16px 20px 12px',borderBottom:'1px solid rgba(255,255,255,0.08)',flexShrink:0 },
    body:    { flex:1,overflowY:'auto',padding:'16px 20px',display:'flex',flexDirection:'column',gap:12 },
    sectionLabel: { fontFamily:'var(--font-mono)',fontSize:9,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.08em',display:'block',marginBottom:8 },
    dayTypeTag:(active, color)=>({
      background: active ? color : 'rgba(255,255,255,0.08)',
      color: active ? '#1C1917' : 'rgba(255,255,255,0.45)',
      fontSize:10,
      padding:'3px 10px',
      borderRadius:4,
      cursor:'pointer',
      border:'none',
      fontFamily:'var(--font-mono)',
      fontWeight: active ? 700 : 500,
      transition:'background 0.2s ease, color 0.2s ease',
    }),
    input:   { background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:6,padding:'7px 10px',color:'rgba(255,255,255,0.9)',fontFamily:'var(--font-body)',fontSize:13,width:'100%',outline:'none',boxSizing:'border-box' },
    select:  { background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:6,padding:'7px 10px',color:'rgba(255,255,255,0.9)',fontFamily:'var(--font-body)',fontSize:12,width:'100%',outline:'none',boxSizing:'border-box' },
    iconBtn: { background:'none',border:'none',cursor:'pointer',padding:'3px',display:'flex',alignItems:'center' },
    taskCard:(done,missed)=>({
      background: done ? 'rgba(132,204,22,0.06)' : missed ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.04)',
      border:`1px solid ${done ? 'rgba(132,204,22,0.2)' : missed ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)'}`,
      borderRadius:6, padding:'9px 12px',
    }),
  };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.panel} onClick={e=>e.stopPropagation()}>

        {/* ── Header ── */}
        <div style={S.hdr}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
            <div>
              <div style={{fontFamily:'DM Mono,monospace',fontSize:9,color:'#A8A29E',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:4}}>
                {isToday?'📅 Today':isPast?'⏮ Past Day':'🔜 Upcoming'}
              </div>
              <div style={{fontFamily:'DM Sans,sans-serif',fontSize:15,fontWeight:600,color:'#FAFAF9',lineHeight:1.4}}>
                {fmt(dateKey)}
              </div>
              {tasks.length>0 && (
                <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,color:'#F97316',marginTop:5}}>
                  {completedHrs.toFixed(1)} / {plannedHrs.toFixed(1)} hrs done · {tasks.filter(t=>t.done).length}/{tasks.length} tasks
                </div>
              )}
            </div>
            <button onClick={onClose} style={{...S.iconBtn,color:'#57534E',fontSize:18}}>✕</button>
          </div>
        </div>

        <div style={S.body}>

          <div>
            <span style={S.sectionLabel}>Day Type</span>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {DAY_TYPE_ORDER.map((type) => {
                const active = dayType === type;
                const tagColor = EVENT_TYPES[type]?.color || EVENT_TYPES.study.color;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleDayTypeSelect(type)}
                    style={S.dayTypeTag(active, tagColor)}
                  >
                    {EVENT_TYPES[type]?.label || type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Tasks section ── */}
          <div>
            <span style={S.sectionLabel}>Tasks {tasks.length>0 && `(${tasks.length})`}</span>

            {!loaded && (
              <div style={{color:'#57534E',fontFamily:'DM Mono,monospace',fontSize:11}}>Loading…</div>
            )}

            {loaded && tasks.length===0 && (
              <p style={{color:'#57534E',fontFamily:'DM Mono,monospace',fontSize:11,marginBottom:12}}>
                {isPast ? 'Nothing was planned for this day.' : 'No tasks yet. Add one below.'}
              </p>
            )}

            {/* Task cards */}
            <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
              {tasks.map(t => {
                const isMissed = isPast && !t.done;
                const isEditing = editId===t.id;

                return (
                  <div key={t.id} style={S.taskCard(t.done, isMissed)}>
                    {isEditing ? (
                      /* Edit form */
                      <div style={{display:'flex',flexDirection:'column',gap:6}}>
                        <input autoFocus value={editVals.description} onChange={e=>setEditVals(v=>({...v,description:e.target.value}))} style={S.input} placeholder="Task description"/>
                        <div style={{display:'flex',gap:6}}>
                          <select value={editVals.subjectId} onChange={e=>setEditVals(v=>({...v,subjectId:e.target.value}))} style={{...S.select,flex:1}}>
                            <option value="">No Subject</option>
                            {Object.values(subjects).map(s=>(
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                          <input type="number" step="any" min="0.01" value={editVals.estimatedHours} onChange={e=>setEditVals(v=>({...v,estimatedHours:e.target.value}))} style={{...S.input,width:60,textAlign:'center'}} placeholder="Hrs"/>
                        </div>
                        <div style={{display:'flex',gap:6}}>
                          <button onClick={saveEdit} style={{flex:1,background:'rgba(132,204,22,0.85)',color:'#fff',border:'1px solid rgba(132,204,22,0.4)',borderRadius:6,padding:'6px',fontFamily:'var(--font-mono)',fontSize:11,fontWeight:700,cursor:'pointer'}}>Save</button>
                          <button onClick={()=>setEditId(null)} style={{flex:1,background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.55)',border:'none',borderRadius:6,padding:'6px',fontFamily:'var(--font-mono)',fontSize:11,cursor:'pointer'}}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      /* View row */
                      <div style={{display:'flex',alignItems:'flex-start',gap:8}}>
                        {/* Checkbox — only clickable today */}
                        {canEdit && (
                          <button onClick={()=>handleToggleDone(t.id)} title={t.done ? 'Mark as not done' : 'Mark as done'} style={{...S.iconBtn,width:17,height:17,borderRadius:3,border:`1px solid ${t.done?'#34D399':'rgba(255,255,255,0.25)'}`,background:t.done?'#34D399':'transparent',flexShrink:0,marginTop:2,cursor:isToday?'pointer':'default'}}>
                            {t.done ? (
                              <svg style={{width:10,height:10}} fill="none" viewBox="0 0 24 24" stroke="#1C1917" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                            ) : (
                              <span style={{color:'#F87171',fontSize:11,fontWeight:700,lineHeight:1}}>x</span>
                            )}
                          </button>
                        )}

                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontFamily:'var(--font-body)',fontSize:13,color:t.done?'rgba(255,255,255,0.35)':isMissed?'#F87171':'rgba(255,255,255,0.9)',textDecoration:t.done?'line-through':'none',lineHeight:1.4}}>
                            {t.description}
                          </div>
                          <div style={{display:'flex',gap:8,marginTop:3,flexWrap:'wrap',alignItems:'center'}}>
                            {t.subjectId && <span style={{fontSize:9,fontFamily:'var(--font-mono)',color:subColor(t.subjectId)}}>{subName(t.subjectId)}</span>}
                            <span style={{fontSize:9,fontFamily:'var(--font-mono)',color:'rgba(255,255,255,0.28)'}}>{t.estimatedHours}h</span>
                            {isMissed && <span style={{fontSize:9,fontFamily:'var(--font-mono)',color:'#F87171'}}>Missed</span>}
                            {t.done    && <span style={{fontSize:9,fontFamily:'var(--font-mono)',color:'#34D399'}}>Done ✓</span>}
                          </div>
                        </div>

                        {/* Edit + Remove — future/today only, and not done */}
                        {canEdit && !t.done && (
                          <div style={{display:'flex',gap:2,flexShrink:0}}>
                            <button onClick={()=>startEdit(t)} style={{...S.iconBtn,color:'rgba(255,255,255,0.4)'}} title="Edit">
                              <svg style={{width:14,height:14}} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            </button>
                            <button onClick={()=>handleRemove(t.id)} style={{...S.iconBtn,color:'rgba(255,255,255,0.25)'}} title="Remove">
                              <svg style={{width:14,height:14}} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Add Task Form ── */}
            {canEdit && dayType === 'sem_exam' && (
              <div style={{padding:'10px 12px',background:'rgba(55,65,81,0.4)',border:'1px solid rgba(107,114,128,0.25)',borderRadius:6,fontFamily:'var(--font-mono)',fontSize:11,color:'rgba(255,255,255,0.5)',textAlign:'center'}}>
                🚫 Sem Exam day — tasks cannot be added
              </div>
            )}
            {canEdit && dayType !== 'sem_exam' && (
              <form onSubmit={handleAdd} style={{display:'flex',flexDirection:'column',gap:8,padding:12,background:'rgba(255,255,255,0.04)',border:'1px dashed rgba(255,255,255,0.12)',borderRadius:6}}>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:9,color:'#F97316',letterSpacing:'0.06em'}}>+ NEW TASK</div>
                <input
                  type="text"
                  placeholder="What's the task? (e.g. Revise OS Unit 3)"
                  value={form.description}
                  onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                  style={S.input}
                  required
                />
                <div style={{display:'flex',gap:8}}>
                  <select value={form.subjectId} onChange={e=>setForm(f=>({...f,subjectId:e.target.value}))} style={{...S.select,flex:1}}>
                    <option value="">No Subject</option>
                    {Object.values(subjects).map(s=>(
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Hrs"
                    value={form.estimatedHours}
                    onChange={e=>setForm(f=>({...f,estimatedHours:e.target.value}))}
                    style={{...S.input,width:64,textAlign:'center'}}
                    step="any"
                    min="0.01"
                  />
                </div>
                <button
                  type="submit"
                  style={{background:'rgba(249,115,22,0.85)',backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',color:'#fff',border:'1px solid rgba(249,115,22,0.4)',borderRadius:6,padding:'8px',fontFamily:'var(--font-mono)',fontSize:11,fontWeight:700,cursor:'pointer',letterSpacing:'0.04em'}}
                >
                  + Add Task
                </button>
              </form>
            )}
          </div>
        </div>

        {/* ── Footer: Erase All ── */}
        {tasks.length>0 && canEdit && (
          <div style={{padding:'12px 20px',borderTop:'1px solid rgba(255,255,255,0.08)',flexShrink:0}}>
            {!confirm ? (
              <button
                onClick={()=>setConfirm(true)}
                style={{width:'100%',background:'transparent',color:'#F87171',border:'1px solid rgba(248,113,113,0.25)',borderRadius:6,padding:'9px',fontFamily:'var(--font-mono)',fontSize:11,cursor:'pointer',letterSpacing:'0.04em'}}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(248,113,113,0.08)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}
              >
                🗑 Erase All Tasks for this Day
              </button>
            ) : (
              <div style={{display:'flex',gap:8}}>
                <button onClick={handleEraseAll} style={{flex:1,background:'rgba(239,68,68,0.85)',color:'#fff',border:'1px solid rgba(239,68,68,0.4)',borderRadius:6,padding:'9px',fontFamily:'var(--font-mono)',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                  Yes, Erase All
                </button>
                <button onClick={()=>setConfirm(false)} style={{flex:1,background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.55)',border:'none',borderRadius:6,padding:'9px',fontFamily:'var(--font-mono)',fontSize:11,cursor:'pointer'}}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
