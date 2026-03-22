// src/pages/OnboardingPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { useGoalsStore } from '../stores/useGoalsStore';
import { todayISO } from '../utils/dateUtils';

const STEPS = ['Welcome', 'GATE Date', 'Daily Target', 'Target Score', 'Done'];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { uid } = useAuthStore();
  const updateGoals = useGoalsStore(s => s.updateGoals);

  const [step, setStep] = useState(0);
  const [gateExamDate, setGateExamDate] = useState('');
  const [dailyHours, setDailyHours] = useState(5);
  const [targetScore, setTargetScore] = useState('');
  const [saving, setSaving] = useState(false);
  const [daysUntil, setDaysUntil] = useState(null);

  const handleDateChange = (v) => {
    setGateExamDate(v);
    if (v) {
      const d = Math.ceil((new Date(v) - new Date()) / 86400000);
      setDaysUntil(d);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    const today = todayISO();
    await updateGoals(uid, {
      gateExamDate,
      dailyHourTarget: dailyHours,
      targetScore: targetScore ? parseInt(targetScore) : null,
      startDate: today,
    });
    navigate('/dashboard');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, position: 'relative', zIndex: 1 }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div style={{ width: i === step ? 20 : 8, height: 8, borderRadius: 9999, background: i === step ? '#F97316' : i < step ? '#34D399' : 'rgba(255,255,255,0.2)', transition: 'all 0.2s' }} />
            </div>
          ))}
        </div>

        <div className="liquid-glass-strong" style={{ borderRadius: 20, padding: 40 }}>
          {step === 0 && (
            <div className="text-center">
              <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'rgba(255,255,255,0.9)', marginBottom: 12 }}>GATE CS Study Tracker</h1>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 1.6, marginBottom: 32 }}>
                This is your preparation tracker. It doesn't plan for you — you bring your plan, and it keeps you honest.
                <br /><br />
                Everything starts empty. No auto-scheduling. No pre-filling.
                <br />
                Start by answering a few questions.
              </p>
              <button onClick={() => setStep(1)} className="btn-primary w-full py-3">Get Started</button>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'rgba(255,255,255,0.9)', marginBottom: 8 }}>When is your GATE exam?</h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 24 }}>This is required — it powers the countdown and calendar.</p>
              <label className="label">GATE Exam Date</label>
              <input
                type="date"
                value={gateExamDate}
                onChange={e => handleDateChange(e.target.value)}
                min={todayISO()}
                className="input mb-4"
              />
              {daysUntil !== null && (
                <div style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 24 }}>
                  <span style={{ color: '#F97316', fontSize: 13, fontFamily: 'var(--font-mono)' }}>That's {daysUntil} days from today.</span>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep(0)} className="btn-secondary flex-1">Back</button>
                <button
                  onClick={() => { if (gateExamDate) setStep(2); }}
                  disabled={!gateExamDate}
                  className="btn-primary flex-1 disabled:opacity-40"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'rgba(255,255,255,0.9)', marginBottom: 8 }}>Daily study target</h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 24 }}>How many hours can you realistically study per day?</p>
              <div className="mb-2 flex items-center justify-between">
                <label className="label">Hours per day</label>
                <span style={{ color: '#F97316', fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600 }}>{dailyHours}h</span>
              </div>
              <input
                type="range"
                min={1} max={14} value={dailyHours}
                onChange={e => setDailyHours(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: '#F97316', marginBottom: 8, cursor: 'pointer' }}
              />
              <div className="flex justify-between mb-8" style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                <span>1h</span><span>5h (avg)</span><span>10h</span><span>14h</span>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="btn-secondary flex-1">Back</button>
                <button onClick={() => setStep(3)} className="btn-primary flex-1">Continue</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'rgba(255,255,255,0.9)', marginBottom: 8 }}>Target score</h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 24 }}>What score are you aiming for? GATE is out of 100. (Optional — skip to continue.)</p>
              <label className="label">Target Score (out of 100)</label>
              <input
                type="number"
                value={targetScore}
                onChange={e => setTargetScore(e.target.value)}
                placeholder="e.g. 65"
                min={0} max={100}
                className="input mb-8"
              />
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="btn-secondary flex-1">Back</button>
                <button onClick={() => setStep(4)} className="btn-primary flex-1">
                  {targetScore ? 'Continue' : 'Skip'}
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center">
              <div style={{ width: 48, height: 48, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg style={{ width: 24, height: 24, color: '#34D399' }} fill="none" viewBox="0 0 24 24" stroke="#34D399" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'rgba(255,255,255,0.9)', marginBottom: 12 }}>You're set up.</h2>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 1.6, marginBottom: 32 }}>
                Your tracker is empty — go to <strong style={{ color: 'rgba(255,255,255,0.9)' }}>Subjects</strong> to define your plan for each subject, and to <strong style={{ color: 'rgba(255,255,255,0.9)' }}>Calendar</strong> to mark your study days.
              </p>
              <div className="flex flex-col gap-3">
                <button onClick={() => { handleFinish().then(() => navigate('/subjects')); }} className="btn-secondary py-2.5">Go to Subjects</button>
                <button onClick={() => { handleFinish().then(() => navigate('/calendar')); }} className="btn-secondary py-2.5">Go to Calendar</button>
                <button onClick={handleFinish} disabled={saving} className="btn-primary py-2.5">
                  {saving ? 'Saving...' : 'Open Dashboard'}
                </button>
              </div>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.28)', fontSize: 11, marginTop: 24, fontFamily: 'var(--font-mono)' }}>
          A tool is only as good as how honestly you use it.
        </p>
      </div>
    </div>
  );
}
