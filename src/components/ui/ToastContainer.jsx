// src/components/ui/ToastContainer.jsx
import React from 'react';
import { useUIStore } from '../../stores/useUIStore';

const TOAST_STYLES = {
  info: 'border-border bg-surface text-text-primary',
  success: 'border-accent-green/30 bg-accent-green/10 text-accent-green',
  error: 'border-accent-red/30 bg-accent-red/10 text-accent-red',
  warning: 'border-accent-orange/30 bg-accent-orange/10 text-accent-orange',
};

export default function ToastContainer() {
  const { toasts, removeToast } = useUIStore();
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-start gap-3 border rounded-lg px-4 py-3 text-sm shadow-lg transition-all animate-fade-in ${TOAST_STYLES[t.type] || TOAST_STYLES.info}`}
        >
          <span className="flex-1 text-sm leading-relaxed">{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="text-text-muted hover:text-text-primary ml-2 shrink-0">✕</button>
        </div>
      ))}
    </div>
  );
}
