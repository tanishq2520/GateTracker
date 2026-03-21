import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth, setPersistence, browserSessionPersistence, signOut } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// ============================================================
// FIREBASE STORAGE SETUP — DO THIS IN FIREBASE CONSOLE FIRST
// ============================================================
// STEP 1: Firebase Console -> Build -> Storage -> Get Started
// STEP 2: Start in TEST MODE -> Next -> Choose same region as Firestore (asia-south1) -> Done
// STEP 3: Install storage in project: npm install firebase
// STEP 4: Storage is initialized below with getStorage(app)
// STEP 5: Storage rules (paste in Storage -> Rules tab):
//   rules_version = '2';
//   service firebase.storage {
//     match /b/{bucket}/o {
//       match /{allPaths=**} {
//         allow read, write: if request.auth != null;
//       }
//     }
//   }
// ============================================================

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'REPLACE_ME',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'REPLACE_ME',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'REPLACE_ME',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'REPLACE_ME',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'REPLACE_ME',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'REPLACE_ME',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

setPersistence(auth, browserSessionPersistence).catch((err) => {
  console.warn('Firebase auth persistence failed:', err);
});

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Firebase persistence failed: multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('Firebase persistence not supported in this browser');
  }
});

const ONE_HOUR = 60 * 60 * 1000;

export const startSessionTimer = () => {
  if (window._sessionTimer) clearTimeout(window._sessionTimer);

  window._sessionTimer = setTimeout(async () => {
    try {
      await signOut(auth);
    } finally {
      window.location.href = '/login';
    }
  }, ONE_HOUR);
};

export const resetSessionTimer = () => {
  startSessionTimer();
};
