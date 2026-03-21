// src/components/gamification/XPFloat.jsx
// Listens for 'xp-earned' DOM events and renders CSS-animated floating +XP text.
import React, { useState, useEffect } from 'react';

let nextId = 0;

export default function XPFloat() {
  const [floats, setFloats] = useState([]);

  useEffect(() => {
    const handle = (e) => {
      const id = ++nextId;
      const { amount, label } = e.detail;
      setFloats(prev => [...prev, { id, amount, label }]);
      // Remove after animation completes (1.4s)
      setTimeout(() => setFloats(prev => prev.filter(f => f.id !== id)), 1400);
    };
    window.addEventListener('xp-earned', handle);
    return () => window.removeEventListener('xp-earned', handle);
  }, []);

  if (floats.length === 0) return null;

  return (
    <div className="xp-float-container" aria-hidden="true">
      {floats.map(f => (
        <div key={f.id} className="xp-float-pill">
          +{f.amount} XP
        </div>
      ))}
    </div>
  );
}
