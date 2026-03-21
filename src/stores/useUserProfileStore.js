import { create } from 'zustand';
import { loadUserProfile, saveUserProfile } from '../firebase/userProfile';

const DEFAULT_PROFILE = {
  displayName: '',
  age: null,
  photoURL: null,
  createdAt: null,
  lastSeen: null,
};

export const useUserProfileStore = create((set, get) => ({
  profile: { ...DEFAULT_PROFILE },
  isLoaded: false,

  resetProfile: () => set({ profile: { ...DEFAULT_PROFILE }, isLoaded: false }),

  loadProfile: async (uid, authUser = null) => {
    if (!uid) {
      get().resetProfile();
      return;
    }

    const data = await loadUserProfile(uid);
    set({
      profile: {
        ...DEFAULT_PROFILE,
        displayName: authUser?.displayName || '',
        photoURL: authUser?.photoURL || null,
        ...data,
      },
      isLoaded: true,
    });
  },

  updateProfile: async (uid, updates) => {
    if (!uid) return;

    const nextProfile = {
      ...get().profile,
      ...updates,
    };

    set({ profile: nextProfile });
    await saveUserProfile(uid, updates);
  },
}));
