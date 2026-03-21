// src/App.jsx
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { initAuth } from './firebase/config';
import { useAuthStore } from './stores/useAuthStore';
import { useGoalsStore } from './stores/useGoalsStore';
import { useSubjectsStore } from './stores/useSubjectsStore';
import { useCalendarStore } from './stores/useCalendarStore';
import { useMockTestStore } from './stores/useMockTestStore';
import { useDailyLogStore } from './stores/useDailyLogStore';
import { useGamificationStore } from './stores/useGamificationStore';
import { todayISO } from './utils/dateUtils';

// Layout
import AppLayout from './components/layout/AppLayout';
import ToastContainer from './components/ui/ToastContainer';
import XPFloat from './components/gamification/XPFloat';
import BossBattle from './components/gamification/BossBattle';

// Pages
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import CalendarPage from './pages/CalendarPage';
import SubjectsPage from './pages/SubjectsPage';
import SubjectDetailPage from './pages/SubjectDetailPage';
import MockTestsPage from './pages/MockTestsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import AchievementsPage from './pages/AchievementsPage';

const LoadingScreen = () => (
  <div style={{ minHeight: '100vh', background: '#1C1917', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ width: 32, height: 32, border: '2px solid #F97316', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
      <p style={{ color: '#A8A29E', fontSize: '0.8rem', fontFamily: 'DM Mono, monospace' }}>Initializing…</p>
    </div>
  </div>
);

export default function App() {
  const { uid, isLoading, setUser }     = useAuthStore();
  const loadGoals                        = useGoalsStore(s => s.loadGoals);
  const hasGoals                         = useGoalsStore(s => s.hasGoals);
  const loadSubjects                     = useSubjectsStore(s => s.loadSubjects);
  const loadEvents                       = useCalendarStore(s => s.loadEvents);
  const detectMissed                     = useCalendarStore(s => s.detectMissedEvents);
  const gateExamDate                     = useGoalsStore(s => s.goals.gateExamDate);
  const loadTests                        = useMockTestStore(s => s.loadTests);
  const loadLogs                         = useDailyLogStore(s => s.loadLogs);
  const loadGamification                 = useGamificationStore(s => s.loadGamification);

  const [dataLoaded, setDataLoaded] = useState(false);
  const [isOnline, setIsOnline]     = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    initAuth().then(async (user) => {
      setUser(user);
      const uid = user.uid;
      await Promise.all([
        loadGoals(uid),
        loadSubjects(uid),
        loadEvents(uid),
        loadTests(uid),
        loadLogs(uid),
        loadGamification(),   // no uid — personal-use
      ]);

      // Fix 5: Auto-create today's tasks from Calendar Quick Fill
      const currentLogs = useDailyLogStore.getState().logs;
      const today = todayISO();
      if (!currentLogs[today]) {
        const todayEvents = Object.values(useCalendarStore.getState().events)
          .filter(e => e.date === today && e.tasks && e.tasks.length > 0);
        
        if (todayEvents.length > 0) {
          const combinedTasks = todayEvents.reduce((acc, ev) => [...acc, ...ev.tasks], []);
          await useDailyLogStore.getState().setDailyLog(uid, today, {
            date: today,
            tasks: combinedTasks.map(t => ({ ...t, done: false, doneAt: null })),
            notes: ''
          });
        }
      }

      setDataLoaded(true);
      detectMissed(gateExamDate);
    }).catch(err => {
      console.error('Init failed:', err);
      setDataLoaded(true);
    });
  }, []);

  if (isLoading || !dataLoaded) return <LoadingScreen />;

  return (
    <BrowserRouter>
      <ToastContainer />
      {/* Global gamification overlays */}
      <XPFloat />
      <BossBattle />
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/" element={
          hasGoals() ? <AppLayout isOnline={isOnline} /> : <Navigate to="/onboarding" replace />
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"      element={<DashboardPage />} />
          <Route path="calendar"       element={<CalendarPage />} />
          <Route path="subjects"       element={<SubjectsPage />} />
          <Route path="subjects/:id"   element={<SubjectDetailPage />} />
          <Route path="mock-tests"     element={<MockTestsPage />} />
          <Route path="analytics"      element={<AnalyticsPage />} />
          <Route path="achievements"   element={<AchievementsPage />} />
          <Route path="settings"       element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
