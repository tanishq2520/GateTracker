import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, onSnapshot } from 'firebase/firestore';
import { db } from './config';

// Keep profile docs under each authenticated user so profile data never leaks across accounts.
export const userProfileRef = (uid) => doc(db, `users/${uid}/userProfile/main`);

export const initUserProfile = async (user) => {
  if (!user?.uid) return null;

  const ref = userProfileRef(user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      displayName: user.displayName || '',
      age: null,
      photoURL: user.photoURL || null,
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
    });
  } else {
    await updateDoc(ref, { lastSeen: serverTimestamp() });
  }

  const latest = await getDoc(ref);
  return latest.exists() ? latest.data() : null;
};

export const loadUserProfile = async (uid) => {
  if (!uid) return null;

  const snap = await getDoc(userProfileRef(uid));
  return snap.exists() ? snap.data() : null;
};

export const saveUserProfile = async (uid, updates) => {
  if (!uid) return;

  await setDoc(
    userProfileRef(uid),
    {
      ...updates,
      lastSeen: serverTimestamp(),
    },
    { merge: true }
  );
};

// ── LIVE PRESENCE ───────────────────────────────────────────
export const updateHeartbeat = async (uid) => {
  if (!uid) return;
  await updateDoc(userProfileRef(uid), {
    lastSeen: serverTimestamp(),
  });
};

// Simple active count: users who were seen in the last 2 minutes
// Note: This requires a query across the 'users' collection structure.
// Given the project structure uses `users/{uid}/userProfile/main`, 
// we'd ideally use a collection group query or just a flat 'active_users' collection.
// However, let's stick to a simpler approach for now: a global 'presence' collection.
// But to avoid complexity for the user, I'll use a collection group query if possible, 
// OR just implement a 'presence' document for now if collection groups are not set up.
// Actually, let's use a dedicated 'presence' collection for easier real-time counting.

export const presenceRef = collection(db, 'presence');
export const userPresenceDoc = (uid) => doc(db, 'presence', uid);

export const updatePresence = async (uid, displayName) => {
  if (!uid) return;
  await setDoc(userPresenceDoc(uid), {
    displayName,
    lastSeen: serverTimestamp(),
  });
};

export const subscribeToActiveCount = (onUpdate) => {
  const q = query(presenceRef);
  return onSnapshot(q, (snapshot) => {
    const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
    const active = snapshot.docs.filter(d => {
      const lastSeen = d.data().lastSeen?.toMillis() || 0;
      return lastSeen > twoMinutesAgo;
    });
    onUpdate(active.length);
  });
};
