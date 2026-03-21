import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
