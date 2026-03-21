// src/stores/useUIStore.js
import { create } from 'zustand';

export const useUIStore = create((set) => ({
  // Modal state
  activeModal: null,        // 'addEvent' | 'editEvent' | 'logToday' | 'addSubject' | 'addTest' | 'confirmReset'
  modalData: null,          // payload passed to modal

  // Navigation
  sidebarOpen: true,        // desktop sidebar
  mobileSidebarOpen: false, // mobile sidebar

  // Toast notifications
  toasts: [],

  // Cascade shift banner dismissed per session
  shiftBannerDismissed: false,

  openModal: (name, data = null) => set({ activeModal: name, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),
  setModalData: (data) => set({ modalData: data }),

  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  setMobileSidebar: (open) => set({ mobileSidebarOpen: open }),

  showToast: (message, type = 'info', duration = 4000) => {
    const id = Date.now();
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }));
    }, duration);
  },

  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  dismissShiftBanner: () => set({ shiftBannerDismissed: true }),
  resetShiftBanner: () => set({ shiftBannerDismissed: false }),
}));
