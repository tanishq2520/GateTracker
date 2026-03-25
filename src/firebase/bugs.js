// src/firebase/bugs.js
import { 
  collection, doc, setDoc, updateDoc, deleteDoc, 
  onSnapshot, query, orderBy, serverTimestamp, arrayUnion 
} from 'firebase/firestore';
import { db } from './config';

const BUGS_COLLECTION = 'global_bugs';

export const bugsRef = collection(db, BUGS_COLLECTION);
export const bugDoc = (id) => doc(db, BUGS_COLLECTION, id);

/**
 * Subscribe to all bug reports (real-time)
 */
export const subscribeToBugs = (onUpdate) => {
  const q = query(bugsRef, orderBy('timestamp', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const bugs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    onUpdate(bugs);
  });
};

/**
 * Add a new bug report
 */
export const addBug = async (uid, displayName, text, image = null, userEmail = null) => {
  const newBugRef = doc(bugsRef); // auto-id
  await setDoc(newBugRef, {
    uid,
    displayName,
    userEmail,
    text,
    image,
    timestamp: serverTimestamp(),
    type: 'user_report',
    reactions: []
  });
};

/**
 * Update a bug report (edit message)
 */
export const updateBug = async (id, text) => {
  await updateDoc(bugDoc(id), {
    text,
    updatedAt: serverTimestamp()
  });
};

/**
 * Delete a bug report
 */
export const deleteBug = async (id) => {
  await deleteDoc(bugDoc(id));
};

/**
 * Add a reaction to a bug report
 */
export const addBugReaction = async (id, emoji) => {
  await updateDoc(bugDoc(id), {
    reactions: arrayUnion(emoji)
  });
};
