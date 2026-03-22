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


  const glassInput = {
    display: 'block',
    width: '100%',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: 13,
    fontFamily: 'var(--font-body)',
    color: 'rgba(255,255,255,0.9)',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const sectionHdr = {
    fontSize: 10,
    fontFamily: 'var(--font-body)',
    fontWeight: 500,
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    marginBottom: 16,
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', position: 'relative', zIndex: 1 }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'rgba(255,255,255,0.9)', letterSpacing: '-0.02em', marginBottom: 28 }}>Settings</h1>

      {/* GATE Configuration */}
      <div className="liquid-glass" style={{ borderRadius: 16, padding: '24px', marginBottom: 16 }}>
        <h2 style={sectionHdr}>GATE Configuration</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', ...sectionHdr, marginBottom: 6 }}>GATE Exam Date</label>
            <input type="date" value={form.gateExamDate} onChange={e => setForm(f => ({ ...f, gateExamDate: e.target.value }))} style={glassInput} />
          </div>
          <div>
            <label style={{ display: 'block', ...sectionHdr, marginBottom: 6 }}>Target Score (out of 100)</label>
            <input type="number" value={form.targetScore} onChange={e => setForm(f => ({ ...f, targetScore: e.target.value }))} placeholder="e.g. 65" min={0} max={100} style={glassInput} />
          </div>
          <div>
            <label style={{ display: 'block', ...sectionHdr, marginBottom: 6 }}>Daily Study Target — {form.dailyHourTarget}h/day</label>
            <input type="range" min={1} max={14} value={form.dailyHourTarget} onChange={e => setForm(f => ({ ...f, dailyHourTarget: parseInt(e.target.value) }))} style={{ width: '100%', accentColor: '#F97316', marginTop: 4 }} />
          </div>
          <div>
            <label style={{ display: 'block', ...sectionHdr, marginBottom: 6 }}>Prep Start Date (for Day N counter)</label>
            <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} style={glassInput} />
          </div>
          <button onClick={handleSave} disabled={saving} style={{ background: 'rgba(249,115,22,0.85)', backdropFilter: 'blur(8px)', color: '#fff', border: '1px solid rgba(249,115,22,0.4)', borderRadius: 8, padding: '9px 20px', fontFamily: 'var(--font-body)', fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, alignSelf: 'flex-start' }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="liquid-glass" style={{ borderRadius: 16, padding: '24px', marginBottom: 16 }}>
        <h2 style={sectionHdr}>Notifications</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontFamily: 'var(--font-body)' }}>Daily Reminder</div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontFamily: 'var(--font-body)', marginTop: 2 }}>Morning reminder shows today's planned events</div>
            </div>
            <button
              onClick={handleNotifToggle}
              style={{ position: 'relative', display: 'inline-flex', height: 20, width: 36, alignItems: 'center', borderRadius: 9999, transition: 'background 0.2s', background: notifEnabled ? '#F97316' : 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer' }}
            >
              <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'transform 0.2s', transform: notifEnabled ? 'translateX(18px)' : 'translateX(2px)' }} />
            </button>
          </div>
          {notifEnabled && (
            <div>
              <label style={{ display: 'block', ...sectionHdr, marginBottom: 6 }}>Reminder Time</label>
              <input type="time" value={notifTime} onChange={e => setNotifTime(e.target.value)} style={glassInput} />
            </div>
          )}
        </div>
      </div>

      {/* Data Management */}
      <div className="liquid-glass" style={{ borderRadius: 16, padding: '24px', marginBottom: 16 }}>
        <h2 style={sectionHdr}>Data Management</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontFamily: 'var(--font-body)' }}>Firebase Sync</div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontFamily: 'var(--font-body)', marginTop: 2 }}>Connected to Firestore</div>
            </div>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#34D399', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
              <span style={{ width: 6, height: 6, background: '#34D399', borderRadius: '50%' }} />
              Online
            </span>
          </div>
          <div style={{ padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontFamily: 'var(--font-mono)', marginBottom: 4 }}>Local Device ID</div>
            <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: 10, fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{uid}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={handleExport} disabled={exporting} className="liquid-glass" style={{ color: 'rgba(255,255,255,0.7)', padding: '9px 16px', borderRadius: 8, fontFamily: 'var(--font-body)', fontSize: 13, cursor: 'pointer', border: 'none', textAlign: 'left' }}>
              {exporting ? 'Exporting...' : 'Export All Data as JSON'}
            </button>
            <button
              onClick={handleSignOut}
              style={{ background: 'rgba(248,113,113,0.08)', color: '#F87171', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 8, padding: '9px 16px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, textAlign: 'left' }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Reset */}
      <div className="liquid-glass" style={{ borderRadius: 16, padding: '24px', border: '1px solid rgba(248,113,113,0.15)' }}>
        <h2 style={{ ...sectionHdr, color: '#F87171' }}>Danger Zone</h2>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, fontFamily: 'var(--font-body)', marginBottom: 16 }}>
          This clears all local cached data. Your Firestore data is unaffected.
        </p>
        <label style={{ display: 'block', ...sectionHdr, marginBottom: 6 }}>Type RESET to confirm</label>
        <div style={{ display: 'flex', gap: 12 }}>
          <input
            type="text"
            value={resetConfirm}
            onChange={e => setResetConfirm(e.target.value)}
            placeholder='Type "RESET"'
            style={{ ...glassInput, flex: 1 }}
          />
          <button onClick={handleReset} style={{ background: 'rgba(248,113,113,0.12)', color: '#F87171', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, padding: '9px 16px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, whiteSpace: 'nowrap' }}>Reset Cache</button>
        </div>
      </div>
    </div>
  );
}
