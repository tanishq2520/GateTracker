// src/components/layout/AppLayout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import { useUIStore } from '../../stores/useUIStore';
import CascadeShiftBanner from '../ui/CascadeShiftBanner';

export default function AppLayout({ isOnline }) {
  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Offline indicator */}
        {!isOnline && (
          <div className="bg-accent-orange/10 border-b border-accent-orange/20 px-4 py-1.5 text-xs text-accent-orange font-mono text-center">
            Offline — changes will sync when connection is restored
          </div>
        )}

        {/* Cascade shift banner (missed day detection prompt) */}
        <CascadeShiftBanner />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto px-6 py-6 md:px-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  );
}
