// src/firebase/config.js
import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

// Firebase web app config — paste from Firebase Console if needed
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "REPLACE_ME",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "REPLACE_ME",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "REPLACE_ME",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "REPLACE_ME",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "REPLACE_ME",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "REPLACE_ME"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Offline persistence — app works without internet, syncs when back online
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Firebase persistence failed: multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('Firebase persistence not supported in this browser');
  }
});

// No authentication — use a stable local user ID stored in localStorage.
// Firestore must be in test mode (allow read, write: if true) for this to work.
const LOCAL_UID_KEY = 'gate_tracker_uid';
function getOrCreateLocalUID() {
  let uid = localStorage.getItem(LOCAL_UID_KEY);
  if (!uid) {
    uid = 'local_' + Math.random().toString(36).slice(2, 11);
    localStorage.setItem(LOCAL_UID_KEY, uid);
  }
  return uid;
}

// Drop-in replacement for the old initAuth — resolves immediately with local UID
export const initAuth = () => Promise.resolve({ uid: getOrCreateLocalUID() });
