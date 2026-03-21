// src/pages/SettingsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { useAuthStore } from '../stores/useAuthStore';
import { useGoalsStore } from '../stores/useGoalsStore';
import { useUIStore } from '../stores/useUIStore';

import { auth } from '../firebase/config';
import { exportAllData, cacheClear } from '../firebase/firestore';
import { loadSettings, saveSettings } from '../firebase/firestore';
import { todayISO } from '../utils/dateUtils';

export default function SettingsPage() {
  const { uid } = useAuthStore();
  const navigate = useNavigate();
  const goals = useGoalsStore(s => s.goals);
  const updateGoals = useGoalsStore(s => s.updateGoals);
  const showToast = useUIStore(s => s.showToast);

  const [form, setForm] = useState({
    gateExamDate: goals.gateExamDate || '',
    targetScore: goals.targetScore || '',
    dailyHourTarget: goals.dailyHourTarget || 5,
    startDate: goals.startDate || '',
  });
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifTime, setNotifTime] = useState('08:00');
  const [resetConfirm, setResetConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setForm({
      gateExamDate: goals.gateExamDate || '',
      targetScore: goals.targetScore || '',
      dailyHourTarget: goals.dailyHourTarget || 5,
      startDate: goals.startDate || '',
    });
  }, [goals]);

  const handleSave = async () => {
    setSaving(true);
    await updateGoals(uid, {
      gateExamDate: form.gateExamDate,
      targetScore: form.targetScore ? parseInt(form.targetScore) : null,
      dailyHourTarget: parseInt(form.dailyHourTarget),
      startDate: form.startDate,
    });
    showToast('Settings saved.', 'success');
    setSaving(false);
  };

  const handleNotifToggle = async () => {
    if (!notifEnabled) {
      const result = await Notification.requestPermission();
      if (result === 'granted') setNotifEnabled(true);
      else showToast('Notification permission denied.', 'error');
    } else {
      setNotifEnabled(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await exportAllData(uid);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gate-tracker-export-${todayISO()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Data exported successfully.', 'success');
    } catch (e) {
      showToast('Export failed. Please try again.', 'error');
    }
    setExporting(false);
  };

  const handleReset = () => {
    if (resetConfirm !== 'RESET') {
      showToast('Type "RESET" in the box to confirm.', 'warning');
      return;
    }
    cacheClear();
    showToast('All local data cleared. Reload the page to start fresh.', 'info', 8000);
    setResetConfirm('');
  };

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/login');
  };


  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-medium text-text-primary font-mono mb-6">Settings</h1>

      {/* GATE Configuration */}
      <section className="card mb-4">
        <h2 className="text-sm font-mono font-medium text-text-primary mb-4 uppercase tracking-wider">GATE Configuration</h2>
        <div className="space-y-4">
          <div>
            <label className="label">GATE Exam Date</label>
            <input type="date" value={form.gateExamDate} onChange={e => setForm(f => ({ ...f, gateExamDate: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="label">Target Score (out of 100)</label>
            <input type="number" value={form.targetScore} onChange={e => setForm(f => ({ ...f, targetScore: e.target.value }))} placeholder="e.g. 65" min={0} max={100} className="input" />
          </div>
          <div>
            <label className="label">Daily Study Target — {form.dailyHourTarget}h/day</label>
            <input type="range" min={1} max={14} value={form.dailyHourTarget} onChange={e => setForm(f => ({ ...f, dailyHourTarget: parseInt(e.target.value) }))} className="w-full accent-accent-blue mt-1" />
          </div>
          <div>
            <label className="label">Prep Start Date (for Day N counter)</label>
            <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="input" />
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </section>

      {/* Notifications */}
      <section className="card mb-4">
        <h2 className="text-sm font-mono font-medium text-text-primary mb-4 uppercase tracking-wider">Notifications</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-text-primary text-sm">Daily Reminder</div>
              <div className="text-text-muted text-xs">Morning reminder shows today's planned events</div>
            </div>
            <button
              onClick={handleNotifToggle}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${notifEnabled ? 'bg-accent-blue' : 'bg-border'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${notifEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          </div>
          {notifEnabled && (
            <div>
              <label className="label">Reminder Time</label>
              <input type="time" value={notifTime} onChange={e => setNotifTime(e.target.value)} className="input" />
            </div>
          )}
        </div>
      </section>

      {/* Data Management */}
      <section className="card mb-4">
        <h2 className="text-sm font-mono font-medium text-text-primary mb-4 uppercase tracking-wider">Data Management</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-text-primary text-sm">Firebase Sync</div>
              <div className="text-text-muted text-xs">Connected to Firestore</div>
            </div>
            <span className="flex items-center gap-1.5 text-accent-green text-xs font-mono">
              <span className="w-1.5 h-1.5 bg-accent-green rounded-full" />
              Online
            </span>
          </div>
          <div className="py-2 border-t border-border">
            <div className="text-text-secondary text-xs font-mono mb-1">Local Device ID</div>
            <div className="text-text-muted text-xs font-data break-all">{uid}</div>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <button onClick={handleExport} disabled={exporting} className="btn-secondary text-left">
              {exporting ? 'Exporting...' : 'Export All Data as JSON'}
            </button>
            <button
              onClick={handleSignOut}
              style={{
                background: '#3C3733',
                color: '#EF4444',
                border: '1px solid #EF4444',
                borderRadius: 6,
                padding: '8px 16px',
                cursor: 'pointer',
                fontFamily: 'DM Mono, monospace',
                fontSize: 12,
                textAlign: 'left',
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </section>

      {/* Reset */}
      <section className="card border-accent-red/20">
        <h2 className="text-sm font-mono font-medium text-accent-red mb-4 uppercase tracking-wider">Danger Zone</h2>
        <p className="text-text-secondary text-sm mb-4">
          This clears all local cached data. Your Firestore data is unaffected.
        </p>
        <label className="label">Type RESET to confirm</label>
        <div className="flex gap-3">
          <input
            type="text"
            value={resetConfirm}
            onChange={e => setResetConfirm(e.target.value)}
            placeholder='Type "RESET"'
            className="input"
          />
          <button onClick={handleReset} className="btn-danger whitespace-nowrap">Reset Cache</button>
        </div>
      </section>
    </div>
  );
}
