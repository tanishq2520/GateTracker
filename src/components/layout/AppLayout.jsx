// src/components/layout/AppLayout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import TopNav from './TopNav';
import { useUIStore } from '../../stores/useUIStore';
import CascadeShiftBanner from '../ui/CascadeShiftBanner';

export default function AppLayout({ isOnline }) {
  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      {/* Fixed top navigation */}
      <TopNav />

      {/* Main content area below the nav */}
      <div style={{ paddingTop: '57px', display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {/* Offline indicator */}
        {!isOnline && (
          <div
            style={{
              background: 'rgba(249,115,22,0.1)',
              borderBottom: '1px solid rgba(249,115,22,0.2)',
              padding: '6px 16px',
              fontSize: '11px',
              color: '#F97316',
              fontFamily: 'var(--font-mono)',
              textAlign: 'center',
            }}
          >
            Offline — changes will sync when connection is restored
          </div>
        )}

        {/* Cascade shift banner */}
        <CascadeShiftBanner />

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
