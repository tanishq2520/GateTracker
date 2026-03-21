import React, { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { userProfileRef } from '../../firebase/userProfile';

const getInitials = (displayName) => {
  if (!displayName) return '';

  return displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .join('')
    .slice(0, 2);
};

export default function Avatar({
  size = 36,
  displayName = '',
  showStatus = false,
  photoURLOverride = null,
}) {
  const { user } = useAuth();
  const [photoURL, setPhotoURL] = useState(photoURLOverride || user?.photoURL || null);

  useEffect(() => {
    if (photoURLOverride) {
      setPhotoURL(photoURLOverride);
      return undefined;
    }

    if (!user?.uid) {
      setPhotoURL(user?.photoURL || null);
      return undefined;
    }

    const unsubscribe = onSnapshot(userProfileRef(user.uid), (snap) => {
      if (snap.exists()) {
        const firestorePhoto = snap.data()?.photoURL;
        setPhotoURL(firestorePhoto || user?.photoURL || null);
      } else {
        setPhotoURL(user?.photoURL || null);
      }
    });

    return () => unsubscribe();
  }, [photoURLOverride, user]);

  const initials = getInitials(displayName || user?.displayName || user?.email || '');
  const fallbackSize = Math.max(10, Math.round(size * 0.35));

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {photoURL ? (
        <img
          src={photoURL}
          alt="Profile"
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            objectFit: 'cover',
            display: 'block',
            border: '2px solid #44403C',
          }}
        />
      ) : (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            background: '#F97316',
            color: '#1C1917',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'DM Mono, monospace',
            fontWeight: 600,
            fontSize: fallbackSize,
            overflow: 'hidden',
          }}
        >
          {initials || '?'}
        </div>
      )}

      {showStatus && (
        <span
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#22C55E',
            border: '1.5px solid #1C1917',
          }}
        />
      )}
    </div>
  );
}
