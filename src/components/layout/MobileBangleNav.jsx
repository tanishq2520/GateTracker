import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const N = 9;
const SPACING = 22;
const TOTAL_WIDTH = N * SPACING; // 198
const RADIUS = 185;
const VISIBLE_START = 5;
const VISIBLE_END = 88;
const ACTIVE_ANGLE = 45;

const BANGLE_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', color: '#7F77DD', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>' },
  { id: 'calendar', label: 'Calendar', path: '/calendar', color: '#1D9E75', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>' },
  { id: 'subjects', label: 'Subjects', path: '/subjects', color: '#E0A020', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>' },
  { id: 'mock-tests', label: 'Mock Tests', path: '/mock-tests', color: '#D85A30', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>' },
  { id: 'analytics', label: 'Analytics', path: '/analytics', color: '#378ADD', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>' },
  { id: 'achievements', label: 'Achievements', path: '/achievements', color: '#D4537E', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 3h14M5 3a2 2 0 00-2 2v3a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2M5 3v8m14-8v8M9 17v2m6-2v2m-3-2v2M12 11l1.5 3.5H17l-2.8 2 1 3.5L12 18l-3.2 2 1-3.5L7 13.5h3.5z"/></svg>' },
  { id: 'report-bug', label: 'Bug Report', path: '/report-bug', color: '#888780', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>' },
  { id: 'settings', label: 'Settings', path: '/settings', color: '#534AB7', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zm4.675 7.683a3 3 0 11-6 0 3 3 0 016 0z"/></svg>' },
  { id: 'profile', label: 'Profile', path: '/profile', color: '#639922', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>' },
];

function easeOutCubic(x) {
  return 1 - Math.pow(1 - x, 3);
}

function hexToRgb(hex) {
  let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

export default function MobileBangleNav({ onProfileOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const canvasRef = useRef(null);
  
  const stateRef = useRef({
    openProgress: 0,
    rotationOffset: 0,
    targetOffset: null,
    velocity: 0,
    isDragging: false,
    dragStartAngle: 0,
    dragStartOffset: 0,
    lastTime: 0,
    lastDragAngle: 0,
    lastDragTime: 0,
    hasMoved: false,
    wiggleIndex: -1,
    wiggleStartTime: 0,
    canvasW: 0,
    canvasH: 0,
    images: {},
    imagesLoaded: false,
    animFrame: null,
    targetItemToNavigate: null
  });

  const checkViewport = () => window.innerWidth < 768;
  const [isMobile, setIsMobile] = useState(checkViewport());

  useEffect(() => {
    const handleResize = () => setIsMobile(checkViewport());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const makeImg = (svg, color) => {
      const coloredSvg = svg
        .replace(/stroke="currentColor"/g, `stroke="${color}"`)
        .replace(/fill="currentColor"/g, `fill="${color}"`);
      const blob = new Blob([coloredSvg], { type: 'image/svg+xml;charset=utf-8' });
      const img = new Image();
      img.src = URL.createObjectURL(blob);
      return img;
    };

    BANGLE_ITEMS.forEach(it => {
      stateRef.current.images[it.id + '_white'] = makeImg(it.icon, '#FFFFFF');
      stateRef.current.images[it.id + '_colored'] = makeImg(it.icon, it.color);
    });
    stateRef.current.imagesLoaded = true;
  }, []);

  useEffect(() => {
    if (!isOpen) {
      let activeIdx = BANGLE_ITEMS.findIndex(it => it.path !== '/profile' && location.pathname.startsWith(it.path));
      if (activeIdx === -1) activeIdx = 0; // Default dashboard
      stateRef.current.rotationOffset = -activeIdx * SPACING;
      stateRef.current.targetOffset = null;
      stateRef.current.velocity = 0;
    }
  }, [location.pathname, isOpen]);

  useEffect(() => {
    if (!isMobile) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    const updateSize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
      stateRef.current.canvasW = window.innerWidth;
      stateRef.current.canvasH = window.innerHeight;
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    const render = (time) => {
      const state = stateRef.current;
      const dt = Math.min(time - (state.lastTime || time), 32);
      state.lastTime = time;

      const targetOpen = isOpen ? 1 : 0;
      if (state.openProgress !== targetOpen) {
        state.openProgress += (targetOpen - state.openProgress) * (dt * 0.012);
        if (Math.abs(state.openProgress - targetOpen) < 0.01) {
          state.openProgress = targetOpen;
        }
      }

      if (!state.isDragging && state.targetOffset !== null) {
        const diff = state.targetOffset - state.rotationOffset;
        state.rotationOffset += diff * (dt * 0.015);
        if (Math.abs(diff) < 0.2) {
          state.rotationOffset = state.targetOffset;
          state.targetOffset = null;
        }
      }

      if (!state.isDragging && state.targetOffset === null && Math.abs(state.velocity) > 0.01) {
        state.rotationOffset += state.velocity * dt;
        state.velocity *= 0.86;
        if (Math.abs(state.velocity) < 0.05) {
          state.velocity = 0;
          const nearestIdx = Math.round(-state.rotationOffset / SPACING);
          state.targetOffset = -nearestIdx * SPACING;
        }
      }

      ctx.clearRect(0, 0, state.canvasW, state.canvasH);

      if (state.openProgress > 0) {
        ctx.fillStyle = `rgba(0,0,0,${0.6 * state.openProgress})`;
        ctx.fillRect(0, 0, state.canvasW, state.canvasH);

        const cx = 0;
        const cy = state.canvasH;

        ctx.beginPath();
        ctx.arc(cx, cy, RADIUS, -VISIBLE_END * Math.PI/180, -VISIBLE_START * Math.PI/180);
        ctx.strokeStyle = `rgba(180, 170, 255, ${0.12 * state.openProgress})`;
        ctx.lineWidth = 50;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, RADIUS, -(ACTIVE_ANGLE + 11) * Math.PI/180, -(ACTIVE_ANGLE - 11) * Math.PI/180);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.08 * state.openProgress})`;
        ctx.lineWidth = 50;
        ctx.stroke();

        BANGLE_ITEMS.forEach((item, i) => {
          let angle = (i * SPACING) + state.rotationOffset;
          let diff = (angle - ACTIVE_ANGLE) % TOTAL_WIDTH;
          diff = ((diff + TOTAL_WIDTH/2) % TOTAL_WIDTH + TOTAL_WIDTH) % TOTAL_WIDTH - TOTAL_WIDTH/2;
          let displayAngle = ACTIVE_ANGLE + diff;

          if (displayAngle >= VISIBLE_START - 15 && displayAngle <= VISIBLE_END + 15) {
            let distFromCenter = Math.abs(diff);
            let activeFactor = Math.max(0, 1 - distFromCenter / 28);
            
            let opacity = Math.max(0, 1 - Math.abs(displayAngle - ACTIVE_ANGLE) / 45);
            opacity = easeOutCubic(opacity) * state.openProgress;

            let targetScale = 1 + 0.12 * activeFactor;
            let scale = 0.5 + (targetScale - 0.5) * easeOutCubic(state.openProgress);

            let wiggleRot = 0;
            if (state.wiggleIndex === i) {
              let wt = (time - state.wiggleStartTime) / 420;
              if (wt < 1) {
                // keyframes: 0%{rotate:0} 15%{rotate:-12} 35%{rotate:10} 55%{rotate:-7} 75%{rotate:5} 90%{rotate:-2} 100%{rotate:0}
                // manual keyframe interpolation for the exact wiggle user requested:
                if (wt < 0.15) wiggleRot = -(wt/0.15) * 12;
                else if (wt < 0.35) wiggleRot = -12 + ((wt-0.15)/0.2) * 22;
                else if (wt < 0.55) wiggleRot = 10 - ((wt-0.35)/0.2) * 17;
                else if (wt < 0.75) wiggleRot = -7 + ((wt-0.55)/0.2) * 12;
                else if (wt < 0.90) wiggleRot = 5 - ((wt-0.75)/0.15) * 7;
                else wiggleRot = -2 + ((wt-0.90)/0.1) * 2;
                wiggleRot *= Math.PI / 180;
              } else {
                state.wiggleIndex = -1;
                if (state.targetItemToNavigate === i) {
                   state.targetItemToNavigate = null;
                   setTimeout(() => {
                     setIsOpen(false);
                     if (item.id === 'profile' && onProfileOpen) {
                       onProfileOpen(true);
                     } else {
                       navigate(item.path);
                     }
                   }, 50);
                }
              }
            }

            let rad = -displayAngle * Math.PI / 180;
            let x = cx + RADIUS * Math.cos(rad);
            let y = cy + RADIUS * Math.sin(rad);

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(wiggleRot);
            ctx.scale(scale, scale);

            if (activeFactor > 0.1) {
              ctx.shadowColor = item.color;
              ctx.shadowBlur = 20 * activeFactor * state.openProgress;
            }

            ctx.beginPath();
            ctx.arc(0, 0, 22, 0, Math.PI * 2);
            let rgb = hexToRgb(item.color);
            let bgAlpha = 0.15 + (0.85 * activeFactor);
            ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${bgAlpha * opacity})`;
            ctx.fill();

            ctx.lineWidth = 1.5;
            let borderAlpha = 0.6 + (0.4 * activeFactor);
            ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${borderAlpha * opacity})`;
            ctx.stroke();

            ctx.globalAlpha = opacity;
            const imgKey = item.id + (activeFactor > 0.5 ? '_white' : '_colored');
            const img = state.images[imgKey];
            if (img && img.complete && img.naturalHeight !== 0) {
              ctx.drawImage(img, -10, -10, 20, 20);
            }

            ctx.restore();

            if (opacity > 0.05) {
               ctx.save();
               let lx = cx + (RADIUS + 40) * Math.cos(rad);
               let ly = cy + (RADIUS + 40) * Math.sin(rad);
               ctx.translate(lx, ly);
               
               ctx.fillStyle = `rgba(255, 255, 255, ${activeFactor > 0.5 ? opacity : opacity * 0.65})`;
               ctx.font = `${activeFactor > 0.5 ? '600' : '400'} ${activeFactor > 0.5 ? '10px' : '9px'} var(--font-body, sans-serif)`;
               ctx.textAlign = 'center';
               ctx.textBaseline = 'middle';
               ctx.fillText(item.label, 0, 0);
               ctx.restore();
            }
          }
        });
      }

      state.animFrame = requestAnimationFrame(render);
    };

    stateRef.current.animFrame = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', updateSize);
      cancelAnimationFrame(stateRef.current.animFrame);
    };
  }, [isMobile, isOpen, navigate, onProfileOpen]);

  const getAngle = (clientX, clientY) => {
    const state = stateRef.current;
    const dy = state.canvasH - clientY;
    const dx = clientX;
    return Math.atan2(dy, dx) * 180 / Math.PI;
  };

  const handlePointerDown = (e) => {
    if (!isOpen) return;
    const state = stateRef.current;
    state.isDragging = true;
    state.dragStartAngle = getAngle(e.clientX, e.clientY);
    state.dragStartOffset = state.rotationOffset;
    state.lastDragAngle = state.dragStartAngle;
    state.lastDragTime = Date.now();
    state.hasMoved = false;
    state.velocity = 0;
    state.targetOffset = null;
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    const state = stateRef.current;
    if (!state.isDragging) return;
    const currentAngle = getAngle(e.clientX, e.clientY);
    const delta = currentAngle - state.dragStartAngle;
    
    state.rotationOffset = state.dragStartOffset + delta;

    if (Math.abs(delta) > 2) {
      state.hasMoved = true;
    }

    const timeNow = Date.now();
    const dt = timeNow - state.lastDragTime;
    if (dt > 0) {
      const stepDelta = currentAngle - state.lastDragAngle;
      state.velocity = stepDelta / dt;
    }
    state.lastDragAngle = currentAngle;
    state.lastDragTime = timeNow;
  };

  const handlePointerUp = (e) => {
    const state = stateRef.current;
    if (!state.isDragging) return;
    state.isDragging = false;
    e.target.releasePointerCapture(e.pointerId);

    if (!state.hasMoved) {
      const cx = 0;
      const cy = state.canvasH;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist > RADIUS - 40 && dist < RADIUS + 40) {
         let hit = -1;
         const clickDispAngle = -Math.atan2(dy, dx) * 180 / Math.PI;
         
         BANGLE_ITEMS.forEach((item, i) => {
            let angle = (i * SPACING) + state.rotationOffset;
            let diff = (angle - ACTIVE_ANGLE) % TOTAL_WIDTH;
            diff = ((diff + TOTAL_WIDTH/2) % TOTAL_WIDTH + TOTAL_WIDTH) % TOTAL_WIDTH - TOTAL_WIDTH/2;
            let displayAngle = ACTIVE_ANGLE + diff;
            
            let aDiff = Math.abs(displayAngle - clickDispAngle);
            if (aDiff < 8) {
               hit = i;
            }
         });

         if (hit !== -1) {
            let currentWrap = Math.round((state.rotationOffset + hit * SPACING) / TOTAL_WIDTH);
            state.targetOffset = currentWrap * TOTAL_WIDTH - hit * SPACING;
            
            state.wiggleIndex = hit;
            state.wiggleStartTime = performance.now();
            state.targetItemToNavigate = hit;
            return;
         }
      }
      setIsOpen(false);
    } else {
      if (state.velocity !== 0 && Math.abs(state.velocity) < 0.05) {
        state.velocity = 0;
        let nearestIdx = Math.round(-state.rotationOffset / SPACING);
        state.targetOffset = -nearestIdx * SPACING;
      }
    }
  };

  if (!isMobile) return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 998,
          pointerEvents: isOpen ? 'auto' : 'none',
          touchAction: 'none'
        }}
      />
      <div 
        className="bangle-orb"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          width: '68px',
          height: '68px',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, rgba(180,170,255,0.55), rgba(100,90,200,0.3))',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1.5px solid rgba(255,255,255,0.3)',
          boxShadow: '0 4px 24px rgba(83,74,183,0.3)',
          zIndex: 999,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          padding: '10px 0 0 10px',
          transform: 'translate(-18px, 18px)',
          transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
      >
        <div style={{
           position: 'absolute',
           top: '18px',
           left: '26px',
           width: '18px',
           height: '18px',
           display: 'flex',
           alignItems: 'center',
           justifyContent: 'center',
           color: 'rgba(255,255,255,0.9)',
           transition: 'transform 0.3s ease'
        }}>
           {isOpen ? (
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
           ) : (
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
           )}
        </div>
      </div>
    </>
  );
}
