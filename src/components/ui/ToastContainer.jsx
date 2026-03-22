// src/components/ui/ToastContainer.jsx
import React from 'react';
import { useUIStore } from '../../stores/useUIStore';

const TOAST_STYLES = {
  info: { border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.9)' },
  success: { border: '1px solid rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.1)', color: '#34D399' },
  error: { border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.1)', color: '#F87171' },
  warning: { border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.1)', color: '#FBBF24' },
};

export default function ToastContainer() {
  const { toasts, removeToast } = useUIStore();
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
      {toasts.map(t => (
        <div
          key={t.id}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 12, borderRadius: 10, padding: '12px 16px', fontSize: 13,
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            transition: 'all 0.2s',
            ...(TOAST_STYLES[t.type] || TOAST_STYLES.info),
          }}
        >
          <span style={{ flex: 1, lineHeight: 1.5 }}>{t.message}</span>
          <button onClick={() => removeToast(t.id)} style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', marginLeft: 8, flexShrink: 0 }}>✕</button>
        </div>
      ))}
    </div>
  );
}
