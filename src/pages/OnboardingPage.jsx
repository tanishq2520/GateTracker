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
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full transition-all ${i === step ? 'bg-accent-blue w-5' : i < step ? 'bg-accent-green' : 'bg-border'}`} />
            </div>
          ))}
        </div>

        <div className="card p-8">
          {step === 0 && (
            <div className="text-center">
              <div className="text-4xl mb-4">📊</div>
              <h1 className="text-xl font-medium text-text-primary mb-3 font-mono">GATE CS Study Tracker</h1>
              <p className="text-text-secondary text-sm leading-relaxed mb-8">
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
              <h2 className="text-lg font-medium text-text-primary mb-2 font-mono">When is your GATE exam?</h2>
              <p className="text-text-muted text-sm mb-6">This is required — it powers the countdown and calendar.</p>
              <label className="label">GATE Exam Date</label>
              <input
                type="date"
                value={gateExamDate}
                onChange={e => handleDateChange(e.target.value)}
                min={todayISO()}
                className="input mb-4"
              />
              {daysUntil !== null && (
                <div className="bg-accent-blue/10 border border-accent-blue/20 rounded-md px-3 py-2 mb-6">
                  <span className="text-accent-blue text-sm font-mono">That's {daysUntil} days from today.</span>
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
              <h2 className="text-lg font-medium text-text-primary mb-2 font-mono">Daily study target</h2>
              <p className="text-text-muted text-sm mb-6">How many hours can you realistically study per day?</p>
              <div className="mb-2 flex items-center justify-between">
                <label className="label">Hours per day</label>
                <span className="text-accent-blue font-data text-xl font-medium">{dailyHours}h</span>
              </div>
              <input
                type="range"
                min={1} max={14} value={dailyHours}
                onChange={e => setDailyHours(parseInt(e.target.value))}
                className="w-full accent-accent-blue mb-8 cursor-pointer"
              />
              <div className="flex justify-between text-text-muted text-xs font-mono mb-8">
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
              <h2 className="text-lg font-medium text-text-primary mb-2 font-mono">Target score</h2>
              <p className="text-text-muted text-sm mb-6">What score are you aiming for? GATE is out of 100. (Optional — skip to continue.)</p>
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
              <div className="w-12 h-12 bg-accent-green/10 border border-accent-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-medium text-text-primary mb-3 font-mono">You're set up.</h2>
              <p className="text-text-secondary text-sm leading-relaxed mb-8">
                Your tracker is empty — go to <strong className="text-text-primary">Subjects</strong> to define your plan for each subject, and to <strong className="text-text-primary">Calendar</strong> to mark your study days.
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

        <p className="text-center text-text-muted text-xs mt-6 font-mono">
          A tool is only as good as how honestly you use it.
        </p>
      </div>
    </div>
  );
}
