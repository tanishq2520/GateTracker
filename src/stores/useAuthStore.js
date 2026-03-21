// src/stores/useAuthStore.js
import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  uid: null,
  isLoading: false,  // no async auth — always ready
  setUser: (user) => set({ uid: user?.uid || null, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}));
