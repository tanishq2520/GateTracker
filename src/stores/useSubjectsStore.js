// src/stores/useSubjectsStore.js
import { create } from 'zustand';
import { saveSubject, loadSubjects, deleteSubject, cacheRead } from '../firebase/firestore';
import { todayISO } from '../firebase/firestore';
import { nanoid } from '../utils/nanoid';

export const DEFAULT_SUBJECTS = [
  { name: 'Data Structures', color: '#4F46E5' },
  { name: 'Algorithms', color: '#7C3AED' },
  { name: 'Operating Systems', color: '#DB2777' },
  { name: 'DBMS', color: '#D97706' },
  { name: 'Computer Networks', color: '#059669' },
  { name: 'Theory of Computation', color: '#DC2626' },
  { name: 'Compiler Design', color: '#EA580C' },
  { name: 'Computer Organization', color: '#0891B2' },
  { name: 'Discrete Mathematics', color: '#6366F1' },
  { name: 'Maths', color: '#B45309' },
  { name: 'Programming in C', color: '#0369A1' },
  { name: 'Digital Logic', color: '#7E22CE' },
  { name: 'General Aptitude', color: '#65A30D' },
];

export const useSubjectsStore = create((set, get) => ({
  subjects: {},
  isLoaded: false,

  loadSubjects: async (uid) => {
    const cached = cacheRead(`subjects_${uid}`);
    if (cached) set({ subjects: cached, isLoaded: true });
    const data = await loadSubjects(uid);
    set({ subjects: data || {}, isLoaded: true });
  },

  addSubject: async (uid, subjectData) => {
    const id = nanoid();
    const newSubject = {
      id, name: '', color: '#4F8EF7', totalUnits: 0, units: [],
      lecturesPerDay: 2, plannedStartDate: null, plannedEndDate: null,
      pyqDaysPlanned: 0, testDaysPlanned: 0, revisionDaysPlanned: 0,
      revisionSessions: [], notes: '', status: 'not_started',
      completedOn: null, bossShown: false, gateWeightage: 0,
      ...subjectData,
    };
    set(s => ({ subjects: { ...s.subjects, [id]: newSubject } }));
    await saveSubject(uid, id, newSubject);
    return id;
  },

  updateSubject: async (uid, id, updates) => {
    const current = get().subjects[id];
    if (!current) return;
    const updated = { ...current, ...updates };
    if (updated.units?.length > 0) {
      const done = updated.units.filter(u => u.done).length;
      if (done === 0) updated.status = 'not_started';
      else if (done === updated.units.length) {
        updated.status = 'completed';
        if (!updated.completedOn) updated.completedOn = todayISO();
      } else updated.status = 'in_progress';
    }
    // XP for adding notes first time
    if (updates.notes && !current.notes && updates.notes.trim().length > 0) {
      try {
        const { useGamificationStore } = await import('./useGamificationStore');
        useGamificationStore.getState().awardXP(15, 'Added subject notes');
      } catch {}
    }
    set(s => ({ subjects: { ...s.subjects, [id]: updated } }));
    await saveSubject(uid, id, updated);
  },

  deleteSubject: async (uid, id) => {
    set(s => { const { [id]: _, ...rest } = s.subjects; return { subjects: rest }; });
    await deleteSubject(uid, id);
  },

  markUnitDone: async (uid, subjectId, unitId) => {
    const subject = get().subjects[subjectId];
    if (!subject) return { success: false, reason: 'NOT_FOUND' };
    const unit = subject.units?.find(u => u.id === unitId);
    if (!unit) return { success: false, reason: 'UNIT_NOT_FOUND' };

    const today = todayISO();
    if (unit.plannedDate && unit.plannedDate < today) {
      return {
        success: false, reason: 'PAST_DATE',
        message: `This unit was planned for ${unit.plannedDate}. That day has passed. It counts as missed — you can't go back and mark it done.`,
      };
    }

    const updatedUnits = subject.units.map(u =>
      u.id === unitId ? { ...u, done: true, doneOn: today } : u
    );
    await get().updateSubject(uid, subjectId, { units: updatedUnits });

    // Gamification
    try {
      const { useGamificationStore } = await import('./useGamificationStore');
      const gam = useGamificationStore.getState();
      gam.awardXP(10, 'Unit done');
      gam.updateChallengeProgress('unit_done');

      const updatedSubject = get().subjects[subjectId];
      if (updatedSubject && updatedSubject.status === 'completed' && !updatedSubject.bossShown) {
        gam.awardXP(500, `Subject complete: ${updatedSubject.name}`);
        gam.triggerBossBattle(subjectId);
        gam.checkAndAwardBadges({ subjectId, subjects: get().subjects, tests: {}, logs: {} });
      }
    } catch {}

    return { success: true };
  },

  markRevisionDone: async (uid, subjectId, revisionId) => {
    const subject = get().subjects[subjectId];
    if (!subject) return { success: false };
    const revision = subject.revisionSessions?.find(r => r.id === revisionId);
    if (!revision) return { success: false };

    const today = todayISO();
    if (revision.plannedDate && revision.plannedDate < today) {
      return { success: false, reason: 'PAST_DATE', message: `This revision was planned for ${revision.plannedDate}. That day has passed.` };
    }

    const updatedSessions = subject.revisionSessions.map(r =>
      r.id === revisionId ? { ...r, done: true, doneOn: today } : r
    );
    await get().updateSubject(uid, subjectId, { revisionSessions: updatedSessions });

    try {
      const { useGamificationStore } = await import('./useGamificationStore');
      const gam = useGamificationStore.getState();
      gam.awardXP(40, 'Revision session done');
      gam.updateChallengeProgress('revision');
    } catch {}

    return { success: true };
  },

  getSubjectById: (id) => get().subjects[id] || null,

  getOverallProgress: () => {
    const subjects = Object.values(get().subjects);
    if (subjects.length === 0) return { percent: 0, doneUnits: 0, totalUnits: 0 };
    let totalTopics = 0, doneTopics = 0;
    subjects.forEach(s => {
      (s.units || []).forEach(u => {
        totalTopics += u.totalTopics || 0;
        if (u.done) doneTopics += u.totalTopics || 0;
      });
    });
    const totalUnits = subjects.reduce((acc, s) => acc + (s.units?.length || 0), 0);
    const doneUnits  = subjects.reduce((acc, s) => acc + (s.units?.filter(u => u.done).length || 0), 0);
    return { percent: totalTopics === 0 ? 0 : Math.round((doneTopics / totalTopics) * 100), doneUnits, totalUnits };
  },
}));
