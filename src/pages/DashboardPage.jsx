// src/pages/DashboardPage.jsx
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useGoalsStore } from '../stores/useGoalsStore';
import { useSubjectsStore } from '../stores/useSubjectsStore';
import { useCalendarStore, EVENT_TYPES } from '../stores/useCalendarStore';
import { useDailyLogStore } from '../stores/useDailyLogStore';
import { useAuthStore } from '../stores/useAuthStore';
import { useUIStore } from '../stores/useUIStore';
import { useGamificationStore, BADGE_DEFS } from '../stores/useGamificationStore';
import { todayISO, formatDate, formatFull, getMonthRange, formatMonthYear, addDaysToISO } from '../utils/dateUtils';
import LogTodayModal from '../components/calendar/LogTodayModal';
import LevelBanner from '../components/gamification/LevelBanner';

// ─── tiny helpers ─────────────────────────────────────────────
const DAY_HDR = ['S','M','T','W','T','F','S'];

const S = {
  card:  { background:'#292524', border:'1px solid #44403C', borderRadius:8, padding:'10px 12px' },
  hdr:   { fontSize:10, color:'#A8A29E', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6, fontFamily:'DM Mono,monospace' },
  row:   { display:'flex', alignItems:'center', gap:6, height:20 },
};

export default function DashboardPage() {
  const today  = todayISO();
  const goals  = useGoalsStore(s => s.goals);
  const getDaysToExam   = useGoalsStore(s => s.getDaysToExam);
  const getPrepDay      = useGoalsStore(s => s.getPrepDay);
  const subjects        = useSubjectsStore(s => s.subjects);
  const getOverallProgress = useSubjectsStore(s => s.getOverallProgress);
  const events          = useCalendarStore(s => s.events);
  const todayLog        = useDailyLogStore(s => s.getTodayLog);
  const markTaskDone    = useDailyLogStore(s => s.markTaskDone);
  const uid             = useAuthStore(s => s.uid);
  const showToast       = useUIStore(s => s.showToast);
  const earnedBadges    = useGamificationStore(s => s.earnedBadges);
  const streak          = useGamificationStore(s => s.streak);

  const [showLogModal, setShowLogModal] = useState(false);
  const [calView, setCalView] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() });
  const [fullJourney, setFullJourney] = useState(false);

  const daysLeft = getDaysToExam();
  const prepDay  = getPrepDay();
  const progress = getOverallProgress();
  const log      = todayLog();

  // Today's events
  const todayEvents = useMemo(() =>
    Object.values(events).filter(e => e.date === today), [events, today]);

  // First today event for "Today's Plan"
  const planEvent = todayEvents.find(e => e.status !== 'done') || todayEvents[0];

  // Next 7 days
  const next7 = useMemo(() => {
    const end = addDaysToISO(today, 7);
    return Object.values(events)
      .filter(e => e.date >= today && e.date <= end)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 7);
  }, [events, today]);

  // Drift per subject (excluding sem_exam days)
  const driftItems = useMemo(() => {
    return Object.values(subjects)
      .filter(s => s.plannedEndDate && s.originalEndDate)
      .map(s => {
        let rawDiff = Math.round((new Date(s.plannedEndDate) - new Date(s.originalEndDate)) / 86400000);
        
        // Count sem_exam events in the scheduled window for this subject.
        // Or globally count sem_exam days between subject's original and planned end dates.
        const semExams = Object.values(events).filter(e => 
          e.type === 'sem_exam' && 
          e.date > s.originalEndDate && 
          e.date <= s.plannedEndDate
        ).length;
        
        return {
          name:  s.name,
          color: s.color,
          diff:  Math.max(0, rawDiff - semExams),
          semExamsCount: semExams
        };
      });
  }, [subjects, events]);

  const totalSemExamsFiltered = useMemo(() => {
    // Max of sem exams that actually affected shifts
    return driftItems.length ? Math.max(...driftItems.map(i => i.semExamsCount)) : 0;
  }, [driftItems]);

  const overallDrift = driftItems.length ? Math.max(...driftItems.map(i => i.diff)) : 0;

  // Mock avg score
  // Pull from gamification xpLog indirectly — just read useMockTestStore
  // (We keep the calc in useMockTestStore; here use a simple pass-through)
  const mockAvgEl = useMemo(() => {
    // We can't import useMockTestStore at top (circular) so read from events as a proxy — skip, show "—"
    return '—';
  }, []);

  // Calendar grid renderer
  const renderCalGrid = (year, month, compact = false) => {
    const days = getMonthRange(year, month);
    return (
      <div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap: compact?2:3, marginBottom:4 }}>
          {DAY_HDR.map((d, i) => (
            <div key={i} style={{ textAlign:'center', fontSize:7, color:'#57534E', fontFamily:'DM Mono,monospace' }}>{d}</div>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap: compact?2:3 }}>
          {days.map(({ date, inMonth }) => {
            const dayEvs = Object.values(events).filter(e => e.date === date);
            const isToday = date === today;
            const isGate  = date === goals.gateExamDate;
            return (
              <Link
                key={date}
                to="/calendar"
                style={{
                  background: '#1C1917',
                  border: `1px solid ${isToday ? '#F97316' : '#3C3733'}`,
                  borderRadius: 3,
                  minHeight: compact ? 18 : 26,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '2px 1px 1px',
                  opacity: inMonth ? 1 : 0.18,
                  pointerEvents: inMonth ? 'auto' : 'none',
                  textDecoration: 'none',
                  position: 'relative',
                }}
              >
                <span style={{
                  fontSize: compact ? 6 : 8,
                  color: isToday ? '#F97316' : date < today ? '#57534E' : '#FAFAF9',
                  fontFamily: 'JetBrains Mono,monospace',
                  fontWeight: isToday ? 700 : 400,
                  lineHeight: 1.2,
                }}>
                  {new Date(date + 'T00:00:00').getDate()}
                </span>
                {dayEvs.length > 0 && (
                  <div style={{ display:'flex', gap:1, flexWrap:'wrap', justifyContent:'center', marginTop: 'auto' }}>
                    {dayEvs.slice(0, 3).map(ev => (
                      <div key={ev.id} style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: ev.status === 'done' ? '#84CC16' : ev.status === 'missed' ? '#EF4444' : ev.color,
                      }} />
                    ))}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  const journeyMonths = useMemo(() => {
    if (!fullJourney) return [];
    const months = [];
    const start = new Date();
    const end = goals.gateExamDate
      ? new Date(goals.gateExamDate)
      : new Date(start.getFullYear(), start.getMonth() + 6, 1);
    let cur = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cur <= end) {
      months.push({ year: cur.getFullYear(), month: cur.getMonth() });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
    return months;
  }, [fullJourney, goals.gateExamDate]);

  const subjectList = Object.values(subjects);

  // Drift color helper
  const driftColor = (diff) => {
    if (diff <= 0) return '#84CC16';
    if (diff <= 3) return '#FBBF24';
    if (diff <= 7) return '#F97316';
    return '#EF4444';
  };

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', padding:12, gap:8, overflow:'hidden', boxSizing:'border-box' }}>

      {/* Level-up / milestone banner */}
      <LevelBanner />

      {/* ── Zone 1: Top bar ─────────────────────────────────────── */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'6px 12px', borderBottom:'1px solid #44403C', flexShrink:0,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontFamily:'DM Mono,monospace', fontSize:13, color:'#FAFAF9', fontWeight:600 }}>
            {goals.gateExamDate ? `GATE ${new Date(goals.gateExamDate).getFullYear()}` : 'GATE'}
          </span>
          {daysLeft !== null ? (
            <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:12, color:'#F97316' }}>
              {daysLeft} days left
            </span>
          ) : (
            <Link to="/settings" style={{ fontSize:11, color:'#57534E', fontFamily:'DM Mono,monospace' }}>Set exam date →</Link>
          )}
        </div>
        <div style={{ fontFamily:'DM Mono,monospace', fontSize:11, color:'#A8A29E' }}>
          {prepDay ? `Prep Day ${prepDay}` : ''}{prepDay ? ' · ' : ''}{new Date().toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })}
        </div>
      </div>

      {/* ── Zone 2: 4 stat cards ─────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, flexShrink:0 }}>
        {/* Syllabus */}
        <div style={S.card}>
          <div style={S.hdr}>Syllabus</div>
          <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:22, fontWeight:700, color:'#F97316', lineHeight:1 }}>
            {progress.percent}%
          </div>
          <div style={{ fontSize:9, color:'#57534E', fontFamily:'DM Mono,monospace', marginTop:3 }}>
            {progress.doneUnits}/{progress.totalUnits} units
          </div>
        </div>

        {/* Streak */}
        <div style={S.card}>
          <div style={S.hdr}>Streak</div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:22, fontWeight:700, color:'#F97316', lineHeight:1 }}>
              {streak.currentStreak}d
            </span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#F97316">
              <path d="M12 2C12 2 7 8 7 13a5 5 0 0 0 10 0c0-2.5-1.5-5-1.5-5S14 11 12 11c-1 0-2-1-2-2.5C10 7 12 2 12 2Z" />
            </svg>
          </div>
          <div style={{ fontSize:9, color:'#57534E', fontFamily:'DM Mono,monospace', marginTop:3 }}>
            best: {streak.longestStreak}d
          </div>
        </div>

        {/* Schedule drift */}
        <div style={S.card}>
          <div style={S.hdr}>Schedule</div>
          {driftItems.length === 0 ? (
            <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:13, color:'#84CC16', fontWeight:600 }}>On track</div>
          ) : (
            <>
              <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:13, color: driftColor(overallDrift), fontWeight:600 }}>
                {overallDrift <= 0 ? 'On track' : `+${overallDrift}d drift`}
              </div>
              {totalSemExamsFiltered > 0 && (
                <div style={{ fontSize:8, color:'#57534E', fontFamily:'DM Mono,monospace', marginTop:3, lineHeight:1.2 }}>
                  adjusted for {totalSemExamsFiltered} sem exam<br/>days (not drift)
                </div>
              )}
            </>
          )}
        </div>

        {/* Mock avg */}
        <div style={S.card}>
          <div style={S.hdr}>Mock avg</div>
          <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:22, fontWeight:700, color:'#FAFAF9', lineHeight:1 }}>
            —
          </div>
          <div style={{ fontSize:9, color:'#57534E', fontFamily:'DM Mono,monospace', marginTop:3 }}>
            log mock tests
          </div>
        </div>
      </div>

      {/* ── Zone 3: Two-column main content ──────────────────────── */}
      <div style={{ flex:1, display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:8, minHeight:0 }}>

        {/* ── LEFT COLUMN ───────────────────────────────────────── */}
        <div style={{ display:'flex', flexDirection:'column', gap:8, minHeight:0 }}>

          {/* Today's Plan */}
          <div style={{ ...S.card, flexShrink:0 }}>
            <div style={S.hdr}>Today's Plan</div>
            {(!log || !log.tasks || log.tasks.length === 0) ? (
              <div style={{ fontSize:9, color:'#57534E', fontFamily:'DM Mono,monospace' }}>
                No tasks for today. <button onClick={() => setShowLogModal(true)} style={{ color:'#F97316', background:'none', border:'none', cursor:'pointer' }}>Add your tasks →</button>
              </div>
            ) : (
              <>
                <div style={{ fontSize:9, color:'#A8A29E', fontFamily:'DM Mono,monospace', marginBottom:8 }}>
                  {log.totalCompletedHours} / {log.totalPlannedHours} hrs done today ({log.tasks.filter(t => t.done).length} done / {log.tasks.filter(t => !t.done).length} missed)
                </div>
                
                <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:8 }}>
                  {log.tasks.map(t => (
                    <div key={t.id} style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 6px', background:'#1C1917', border:'1px solid #3C3733', borderRadius:4 }}>
                      <button 
                        onClick={() => markTaskDone(uid, today, t.id, !t.done)}
                        style={{
                          width:14, height:14, borderRadius:2, border:`1px solid ${t.done ? '#84CC16' : '#57534E'}`,
                          background: t.done ? '#84CC16' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center',
                          cursor:'pointer'
                        }}
                      >
                        {t.done && <svg style={{ width:10, height:10, color:'#1C1917' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </button>
                      
                      <span style={{ flex:1, fontSize:9, color: t.done ? '#A8A29E' : '#FAFAF9', fontFamily:'DM Sans,sans-serif', textDecoration: t.done ? 'line-through' : 'none', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {t.description}
                      </span>
                      
                      <span style={{ fontSize:8, color:'#57534E', fontFamily:'JetBrains Mono,monospace', width:26, textAlign:'right', flexShrink:0 }}>
                        {t.estimatedHours}h
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{ display:'flex' }}>
                  <button
                    onClick={() => setShowLogModal(true)}
                    style={{
                      flex:1, background:'#3C3733', color:'#A8A29E', border:'1px solid #44403C',
                      borderRadius:5, padding:'5px 10px', fontSize:9, fontFamily:'DM Mono,monospace',
                      cursor:'pointer', transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#44403C'}
                    onMouseLeave={(e) => e.target.style.background = '#3C3733'}
                  >
                    Manage Tasks
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Subjects list */}
          <div style={{ ...S.card, flex:1, display:'flex', flexDirection:'column', minHeight:0 }}>
            <div style={S.hdr}>Subjects</div>
            {subjectList.length === 0 ? (
              <div style={{ fontSize:9, color:'#57534E', fontFamily:'DM Mono,monospace' }}>
                No subjects yet. <Link to="/subjects" style={{ color:'#F97316' }}>Add subjects →</Link>
              </div>
            ) : (
              <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:2 }}>
                {subjectList.map(s => {
                  const units = s.units || [];
                  const done  = units.filter(u => u.done).length;
                  const pct   = units.length > 0 ? Math.round((done / units.length) * 100) : 0;
                  return (
                    <Link
                      key={s.id}
                      to={`/subjects/${s.id}`}
                      style={{ display:'flex', alignItems:'center', gap:6, height:20, textDecoration:'none', flexShrink:0 }}
                    >
                      <div style={{ width:6, height:6, borderRadius:'50%', background:s.color, flexShrink:0 }} />
                      <span style={{ fontSize:9, color:'#FAFAF9', fontFamily:'DM Sans,sans-serif', width:60, flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {s.name.split(' ')[0]}
                      </span>
                      <div style={{ flex:1, height:3, background:'#3C3733', borderRadius:9999, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${pct}%`, background:s.color, borderRadius:9999 }} />
                      </div>
                      <span style={{ fontSize:7, color:'#57534E', fontFamily:'JetBrains Mono,monospace', width:28, textAlign:'right', flexShrink:0 }}>
                        {done}/{units.length}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Weekly Challenge */}
          <div style={{ ...S.card, flexShrink:0 }}>
            {/* Inline weekly challenge — same data as WeeklyChallenge component */}
            <WeeklyChallengeInline />
          </div>
        </div>

        {/* ── RIGHT COLUMN ──────────────────────────────────────── */}
        <div style={{ display:'flex', flexDirection:'column', gap:8, minHeight:0 }}>

          {/* Journey Calendar — takes most space */}
          <div style={{ ...S.card, flex:1, display:'flex', flexDirection:'column', minHeight:0 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
              <span style={S.hdr}>Calendar</span>
              <button
                onClick={() => setFullJourney(!fullJourney)}
                style={{ fontSize:8, color: fullJourney ? '#F97316' : '#57534E', background:'none', border:'none', cursor:'pointer', fontFamily:'DM Mono,monospace' }}
              >
                {fullJourney ? 'Month' : 'Full Journey'}
              </button>
            </div>

            {!fullJourney ? (
              <div style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                  <button
                    onClick={() => setCalView(v => { const d = new Date(v.year, v.month - 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
                    style={{ background:'none', border:'none', color:'#57534E', cursor:'pointer', padding:'0 4px', fontSize:14, lineHeight:1 }}
                  >‹</button>
                  <span style={{ fontSize:10, color:'#A8A29E', fontFamily:'DM Mono,monospace' }}>
                    {formatMonthYear(`${calView.year}-${String(calView.month + 1).padStart(2, '0')}-01`)}
                  </span>
                  <button
                    onClick={() => setCalView(v => { const d = new Date(v.year, v.month + 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
                    style={{ background:'none', border:'none', color:'#57534E', cursor:'pointer', padding:'0 4px', fontSize:14, lineHeight:1 }}
                  >›</button>
                </div>
                <div style={{ flex:1, minHeight:0 }}>
                  {renderCalGrid(calView.year, calView.month)}
                </div>
              </div>
            ) : (
              <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:12 }}>
                {journeyMonths.map(({ year, month }) => (
                  <div key={`${year}-${month}`}>
                    <div style={{ fontSize:8, color:'#57534E', fontFamily:'DM Mono,monospace', marginBottom:3 }}>
                      {formatMonthYear(`${year}-${String(month + 1).padStart(2, '0')}-01`)}
                    </div>
                    {renderCalGrid(year, month, true)}
                  </div>
                ))}
              </div>
            )}

            {/* Legend */}
            <div style={{ borderTop:'1px solid #44403C', marginTop:6, paddingTop:6, display:'flex', flexWrap:'wrap', gap:'6px 10px' }}>
              {Object.entries(EVENT_TYPES).map(([k, { label, color }]) => (
                <span key={k} style={{ display:'flex', alignItems:'center', gap:4, fontSize:7, color:'#57534E', fontFamily:'DM Mono,monospace' }}>
                  <span style={{ width:5, height:5, borderRadius:'50%', background:color, display:'inline-block' }} />{label}
                </span>
              ))}
              <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:7, color:'#57534E', fontFamily:'DM Mono,monospace' }}>
                <span style={{ width:5, height:5, borderRadius:'50%', background:'#84CC16', display:'inline-block' }} />Done
              </span>
              <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:7, color:'#57534E', fontFamily:'DM Mono,monospace' }}>
                <span style={{ width:5, height:5, borderRadius:'50%', background:'#EF4444', display:'inline-block' }} />Missed
              </span>
            </div>
          </div>

          {/* Next 7 Days */}
          <div style={{ ...S.card, flexShrink:0 }}>
            <div style={S.hdr}>Next 7 Days</div>
            {next7.length === 0 ? (
              <div style={{ fontSize:8, color:'#57534E', fontFamily:'DM Mono,monospace' }}>
                Nothing planned. <Link to="/calendar" style={{ color:'#F97316' }}>Add events →</Link>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {next7.map(ev => (
                  <div key={ev.id} style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:8, color:'#A8A29E', fontFamily:'JetBrains Mono,monospace', width:38, flexShrink:0 }}>
                      {formatDate(ev.date, 'MMM d')}
                    </span>
                    <div style={{ width:5, height:5, borderRadius:'50%', background:ev.color, flexShrink:0 }} />
                    <span style={{ fontSize:8, color:'#FAFAF9', fontFamily:'DM Sans,sans-serif', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {ev.label || EVENT_TYPES[ev.type]?.label || ev.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Drift */}
          <div style={{ ...S.card, flexShrink:0 }}>
            <div style={S.hdr}>Drift</div>
            {driftItems.length === 0 ? (
              <div style={{ fontSize:9, color:'#84CC16', fontFamily:'DM Mono,monospace' }}>On ideal schedule</div>
            ) : overallDrift <= 0 ? (
              <div style={{ fontSize:9, color:'#84CC16', fontFamily:'DM Mono,monospace' }}>On ideal schedule</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                {driftItems.filter(i => i.diff > 0).map((item, idx) => (
                  <div key={idx} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontSize:8, color:'#A8A29E', fontFamily:'DM Mono,monospace' }}>{item.name.split(' ')[0]}</span>
                    <span style={{ fontSize:8, color: driftColor(item.diff), fontFamily:'JetBrains Mono,monospace', fontWeight:600 }}>
                      +{item.diff}d
                    </span>
                  </div>
                ))}
                <div style={{ borderTop:'1px solid #3C3733', marginTop:2, paddingTop:4, fontSize:8, color: driftColor(overallDrift), fontFamily:'JetBrains Mono,monospace', fontWeight:700 }}>
                  Max drift: +{overallDrift}d
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Log Modal */}
      {showLogModal && <LogTodayModal onClose={() => setShowLogModal(false)} />}
    </div>
  );
}

// Inline thin version of WeeklyChallenge that doesn't need a card wrapper
function WeeklyChallengeInline() {
  const challenge = useGamificationStore(s => s.weeklyChallenge);
  if (!challenge) return <div style={{ fontSize:9, color:'#57534E', fontFamily:'DM Mono,monospace' }}>No challenge this week.</div>;
  const pct = challenge.target > 0 ? Math.min(100, Math.round((challenge.progress / challenge.target) * 100)) : 0;
  return (
    <>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
        <span style={{ fontSize:10, color:'#A8A29E', letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:'DM Mono,monospace' }}>Weekly Challenge</span>
        <span style={{ fontSize:9, color:'#F97316', fontFamily:'JetBrains Mono,monospace', fontWeight:600 }}>+{challenge.xpReward} XP</span>
      </div>
      {challenge.completed ? (
        <div style={{ fontSize:9, color:'#84CC16', fontFamily:'DM Mono,monospace', fontWeight:600 }}>Done ✓ +{challenge.xpReward} XP</div>
      ) : (
        <>
          <div style={{ fontSize:9, color:'#FAFAF9', fontFamily:'DM Sans,sans-serif', marginBottom:6, lineHeight:1.4 }}>{challenge.label}</div>
          <div style={{ height:3, background:'#3C3733', borderRadius:9999, overflow:'hidden', marginBottom:4 }}>
            <div style={{ height:'100%', width:`${pct}%`, background:'#F97316', borderRadius:9999 }} />
          </div>
          <div style={{ fontSize:7, color:'#A8A29E', fontFamily:'JetBrains Mono,monospace' }}>
            {challenge.progress} / {challenge.target} · +{challenge.xpReward} XP
          </div>
        </>
      )}
    </>
  );
}
