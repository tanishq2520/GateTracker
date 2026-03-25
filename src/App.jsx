import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useAuthStore } from './stores/useAuthStore';
import { useGoalsStore } from './stores/useGoalsStore';
import { useSubjectsStore } from './stores/useSubjectsStore';
import { useCalendarStore } from './stores/useCalendarStore';
import { useMockTestStore } from './stores/useMockTestStore';
import { useDailyLogStore } from './stores/useDailyLogStore';
import { useGamificationStore } from './stores/useGamificationStore';
import { useUserProfileStore } from './stores/useUserProfileStore';
import { todayISO } from './utils/dateUtils';

import AppLayout from './components/layout/AppLayout';
import ToastContainer from './components/ui/ToastContainer';
import XPFloat from './components/gamification/XPFloat';
import BossBattle from './components/gamification/BossBattle';
import ProtectedRoute from './components/ProtectedRoute';

import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import CalendarPage from './pages/CalendarPage';
import SubjectsPage from './pages/SubjectsPage';
import SubjectDetailPage from './pages/SubjectDetailPage';
import MockTestsPage from './pages/MockTestsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import AchievementsPage from './pages/AchievementsPage';
import LoginPage from './pages/LoginPage';
import ReportBugPage from './pages/ReportBugPage';

const DEFAULT_GOALS = {
  gateExamDate: null,
  dailyHourTarget: 5,
  startDate: null,
  targetScore: null,
};

const LoadingScreen = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ width: 32, height: 32, border: '2px solid #F97316', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>Initializing...</p>
    </div>
  </div>
);

const resetUserStores = () => {
  useGoalsStore.setState({ goals: { ...DEFAULT_GOALS }, isLoaded: false });
  useSubjectsStore.setState({ subjects: {}, isLoaded: false });
  useCalendarStore.setState({ events: {}, isLoaded: false, pendingShift: null });
  useMockTestStore.setState({ tests: {}, isLoaded: false });
  useDailyLogStore.setState({ logs: {}, todayLog: null, isLoaded: false });
  useGamificationStore.getState().resetGamification();
  useUserProfileStore.getState().resetProfile();
};

const ProtectedAppShell = ({ isOnline, dataLoaded }) => {
  const hasGoals = useGoalsStore((s) => s.hasGoals);

  if (!dataLoaded) return <LoadingScreen />;
  if (!hasGoals()) return <Navigate to="/onboarding" replace />;
  return <AppLayout isOnline={isOnline} />;
};

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const setUser = useAuthStore((s) => s.setUser);
  const loadGoals = useGoalsStore((s) => s.loadGoals);
  const loadSubjects = useSubjectsStore((s) => s.loadSubjects);
  const loadEvents = useCalendarStore((s) => s.loadEvents);
  const events = useCalendarStore((s) => s.events);
  const detectMissed = useCalendarStore((s) => s.detectMissedEvents);
  const gateExamDate = useGoalsStore((s) => s.goals.gateExamDate);
  const loadTests = useMockTestStore((s) => s.loadTests);
  const loadLogs = useDailyLogStore((s) => s.loadLogs);
  const loadGamification = useGamificationStore((s) => s.loadGamification);
  const loadProfile = useUserProfileStore((s) => s.loadProfile);

  const [dataLoaded, setDataLoaded] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    setUser(user || null);

    if (!user) {
      resetUserStores();
      setDataLoaded(false);
      return;
    }

    let cancelled = false;
    const uid = user.uid;

    resetUserStores();
    setDataLoaded(false);

    const loadAll = async () => {
      try {
        await Promise.all([
          loadGoals(uid),
          loadSubjects(uid),
          loadEvents(uid),
          loadTests(uid),
          loadLogs(uid),
          loadGamification(uid),
          loadProfile(uid, user),
        ]);

        if (cancelled) return;

        const currentLogs = useDailyLogStore.getState().logs;
        const today = todayISO();
        if (!currentLogs[today]) {
          const todayEvents = Object.values(useCalendarStore.getState().events)
            .filter((event) => event.date === today && event.tasks && event.tasks.length > 0);

          if (todayEvents.length > 0) {
            const combinedTasks = todayEvents.reduce((acc, event) => [...acc, ...event.tasks], []);
            await useDailyLogStore.getState().setDailyLog(uid, today, {
              date: today,
              tasks: combinedTasks.map((task) => ({ ...task, done: false, doneAt: null })),
              notes: '',
            });
          }
        }

        if (cancelled) return;

        setDataLoaded(true);
        detectMissed(gateExamDate);
      } catch (err) {
        console.error('Init failed:', err);
        if (!cancelled) setDataLoaded(true);
      }
    };

    loadAll();

    return () => {
      cancelled = true;
    };
  }, [user, setUser, loadGoals, loadSubjects, loadEvents, loadTests, loadLogs, loadGamification, loadProfile, detectMissed, gateExamDate]);

  useEffect(() => {
    if (!user || !dataLoaded) return;
    detectMissed(gateExamDate);
  }, [user, dataLoaded, gateExamDate, events, detectMissed]);

  if (authLoading) return <LoadingScreen />;

  return (
    <BrowserRouter>
      {/* Global fullscreen video background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4" type="video/mp4" />
      </video>
      {/* Dark overlay for readability */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 0, pointerEvents: 'none' }} />

      <ToastContainer />
      <XPFloat />
      <BossBattle />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              {dataLoaded ? <OnboardingPage /> : <LoadingScreen />}
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <ProtectedAppShell isOnline={isOnline} dataLoaded={dataLoaded} />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="subjects" element={<SubjectsPage />} />
          <Route path="subjects/:id" element={<SubjectDetailPage />} />
          <Route path="mock-tests" element={<MockTestsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="achievements" element={<AchievementsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="report-bug" element={<ReportBugPage />} />
        </Route>
        <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
