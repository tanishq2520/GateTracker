import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  sendPasswordResetEmail,
  signOut,
  updateProfile as updateAuthProfile,
} from 'firebase/auth';
import {
  getDownloadURL,
  ref as storageRef,
  uploadBytesResumable,
} from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import { auth, storage } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useAuthStore } from '../../stores/useAuthStore';
import { useGoalsStore } from '../../stores/useGoalsStore';
import { useUIStore } from '../../stores/useUIStore';
import { useUserProfileStore } from '../../stores/useUserProfileStore';
import Avatar from './Avatar';

const fieldLabelStyle = {
  color: '#A8A29E',
  fontFamily: 'DM Mono, monospace',
  fontSize: 11,
  marginBottom: 6,
};

const sectionHeadingStyle = {
  color: '#F97316',
  fontFamily: 'DM Mono, monospace',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  margin: '18px 0 14px',
};

const fieldValueStyle = {
  color: '#FAFAF9',
  fontFamily: 'DM Mono, monospace',
  fontSize: 13,
};

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: 'rgba(255,255,255,0.9)',
  borderRadius: 8,
  padding: '10px 12px',
  fontFamily: 'var(--font-body)',
  fontSize: 12,
  outline: 'none',
  transition: 'border-color 0.2s',
};

const iconButtonStyle = {
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 6,
  background: 'rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.55)',
  width: 28,
  height: 28,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  flexShrink: 0,
};

const actionButtonStyle = {
  width: '100%',
  borderRadius: 6,
  padding: '10px 12px',
  fontFamily: 'DM Mono, monospace',
  fontSize: 12,
  cursor: 'pointer',
};

const PencilIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const CameraIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7h3l2-2h6l2 2h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);

const formatMemberSince = (profileCreatedAt, authCreatedAt) => {
  let rawDate = null;

  if (profileCreatedAt?.toDate) {
    rawDate = profileCreatedAt.toDate();
  } else if (authCreatedAt) {
    rawDate = new Date(authCreatedAt);
  }

  if (!rawDate || Number.isNaN(rawDate.getTime())) {
    return 'Member since recently';
  }

  return `Member since ${rawDate.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })}`;
};

function SavedMark({ visible }) {
  if (!visible) return null;

  return (
    <span
      style={{
        color: '#22C55E',
        fontFamily: 'DM Mono, monospace',
        fontSize: 11,
        marginLeft: 8,
        whiteSpace: 'nowrap',
      }}
    >
      {'Saved \u2713'}
    </span>
  );
}

function EditableRow({
  label,
  value,
  editing,
  draftValue,
  type = 'text',
  placeholder = '',
  saved,
  onStartEdit,
  onDraftChange,
  onSave,
  onCancel,
}) {
  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.blur();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
      event.currentTarget.blur();
    }
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={fieldLabelStyle}>{label}</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {editing ? (
          <input
            type={type}
            value={draftValue}
            autoFocus
            placeholder={placeholder}
            onChange={(event) => onDraftChange(event.target.value)}
            onBlur={onSave}
            onKeyDown={handleKeyDown}
            style={inputStyle}
          />
        ) : (
          <>
            <div style={{ ...fieldValueStyle, flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {value || <span style={{ color: '#78716C' }}>Not set</span>}
              </span>
              <SavedMark visible={saved} />
            </div>
            <button type="button" onClick={onStartEdit} style={iconButtonStyle} aria-label={`Edit ${label}`}>
              <PencilIcon />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ProfilePanel({ open, onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const saveTimersRef = useRef({});

  const { uid } = useAuthStore();
  const goals = useGoalsStore((state) => state.goals);
  const updateGoals = useGoalsStore((state) => state.updateGoals);
  const profile = useUserProfileStore((state) => state.profile);
  const updateUserProfile = useUserProfileStore((state) => state.updateProfile);
  const loadProfile = useUserProfileStore((state) => state.loadProfile);
  const showToast = useUIStore((state) => state.showToast);

  const [editingName, setEditingName] = useState(false);
  const [editingAge, setEditingAge] = useState(false);
  const [editingExamDate, setEditingExamDate] = useState(false);
  const [editingTargetScore, setEditingTargetScore] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [ageDraft, setAgeDraft] = useState('');
  const [examDateDraft, setExamDateDraft] = useState('');
  const [targetScoreDraft, setTargetScoreDraft] = useState('');
  const [savedFields, setSavedFields] = useState({});
  const [uploadProgress, setUploadProgress] = useState(0);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null);
  const [avatarHovered, setAvatarHovered] = useState(false);
  const [pendingPhotoFile, setPendingPhotoFile] = useState(null);
  const [photoSaved, setPhotoSaved] = useState(false);

  const profileUid = user?.uid || uid;
  const displayName = profile.displayName || user?.displayName || '';
  const email = user?.email || '';
  const displayPhotoURL = photoPreviewUrl || null;
  const isEmailUser = useMemo(
    () => user?.providerData?.[0]?.providerId === 'password',
    [user]
  );

  useEffect(() => {
    if (!open) return undefined;

    const onEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [open, onClose]);

  useEffect(() => {
    setNameDraft(displayName);
  }, [displayName]);

  useEffect(() => {
    setAgeDraft(profile.age === null || profile.age === undefined ? '' : String(profile.age));
  }, [profile.age]);

  useEffect(() => {
    setExamDateDraft(goals.gateExamDate || '');
  }, [goals.gateExamDate]);

  useEffect(() => {
    setTargetScoreDraft(goals.targetScore === null || goals.targetScore === undefined ? '' : String(goals.targetScore));
  }, [goals.targetScore]);

  useEffect(() => () => {
    Object.values(saveTimersRef.current).forEach((timerId) => clearTimeout(timerId));
  }, []);

  if (!open || !user) return null;

  const showSaved = (field) => {
    if (saveTimersRef.current[field]) {
      clearTimeout(saveTimersRef.current[field]);
    }

    setSavedFields((current) => ({ ...current, [field]: true }));
    saveTimersRef.current[field] = setTimeout(() => {
      setSavedFields((current) => ({ ...current, [field]: false }));
    }, 1800);
  };

  const showPhotoSaved = () => {
    if (saveTimersRef.current.photo) {
      clearTimeout(saveTimersRef.current.photo);
    }

    setPhotoSaved(true);
    saveTimersRef.current.photo = setTimeout(() => {
      setPhotoSaved(false);
    }, 1800);
  };

  const clearPendingPhoto = () => {
    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    setPhotoPreviewUrl(null);
    setPendingPhotoFile(null);
    setUploadProgress(0);
  };

  const refreshProfile = async () => {
    if (!profileUid || !auth.currentUser) return;
    await loadProfile(profileUid, auth.currentUser);
  };

  const saveDisplayName = async () => {
    const trimmed = nameDraft.trim();
    setEditingName(false);

    if (trimmed === displayName) return;

    try {
      if (!auth.currentUser) throw new Error('No authenticated user');

      await updateAuthProfile(auth.currentUser, { displayName: trimmed });
      await auth.currentUser.reload();
      await updateUserProfile(profileUid, { displayName: trimmed });
      await refreshProfile();
      showSaved('displayName');
    } catch (error) {
      setNameDraft(displayName);
      showToast('Could not update display name.', 'error');
    }
  };

  const saveAge = async () => {
    const trimmed = ageDraft.trim();
    const nextAge = trimmed === '' ? null : Number(trimmed);
    setEditingAge(false);

    if (trimmed !== '' && (!Number.isFinite(nextAge) || nextAge <= 0)) {
      setAgeDraft(profile.age === null || profile.age === undefined ? '' : String(profile.age));
      showToast('Please enter a valid age.', 'warning');
      return;
    }

    if (nextAge === profile.age) return;

    try {
      await updateUserProfile(profileUid, { age: nextAge });
      await refreshProfile();
      showSaved('age');
    } catch (error) {
      setAgeDraft(profile.age === null || profile.age === undefined ? '' : String(profile.age));
      showToast('Could not update age.', 'error');
    }
  };

  const saveExamDate = async () => {
    const nextDate = examDateDraft || null;
    setEditingExamDate(false);

    if (nextDate === (goals.gateExamDate || null)) return;

    try {
      await updateGoals(profileUid, { gateExamDate: nextDate });
      showSaved('gateExamDate');
    } catch (error) {
      setExamDateDraft(goals.gateExamDate || '');
      showToast('Could not update exam date.', 'error');
    }
  };

  const saveTargetScore = async () => {
    const trimmed = targetScoreDraft.trim();
    const nextScore = trimmed === '' ? null : Number(trimmed);
    setEditingTargetScore(false);

    if (trimmed !== '' && (!Number.isFinite(nextScore) || nextScore < 0)) {
      setTargetScoreDraft(goals.targetScore === null || goals.targetScore === undefined ? '' : String(goals.targetScore));
      showToast('Please enter a valid target score.', 'warning');
      return;
    }

    if (nextScore === goals.targetScore) return;

    try {
      await updateGoals(profileUid, { targetScore: nextScore });
      showSaved('targetScore');
    } catch (error) {
      setTargetScoreDraft(goals.targetScore === null || goals.targetScore === undefined ? '' : String(goals.targetScore));
      showToast('Could not update target score.', 'error');
    }
  };

  const updateDailyHours = async (value) => {
    try {
      await updateGoals(profileUid, { dailyHourTarget: value });
      showSaved('dailyHourTarget');
    } catch (error) {
      showToast('Could not update daily study target.', 'error');
    }
  };

  const handlePhotoSelect = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !profileUid) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Please choose a JPG, PNG, or WEBP image.', 'warning');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('Image must be under 2MB', 'warning');
      return;
    }

    const localPreviewUrl = URL.createObjectURL(file);
    clearPendingPhoto();
    setPhotoPreviewUrl(localPreviewUrl);
    setPendingPhotoFile(file);
    setPhotoSaved(false);
  };

  const handleUploadPhoto = async () => {
    if (!pendingPhotoFile || !profileUid) return;

    const fileRef = storageRef(storage, `users/${profileUid}/profilePhotos/photo.jpg`);
    const uploadTask = uploadBytesResumable(fileRef, pendingPhotoFile);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(Math.round(progress));
      },
      () => {
        setUploadProgress(0);
        showToast('Upload failed. Try again.', 'error');
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          if (!auth.currentUser) {
            throw new Error('No authenticated user');
          }

          await updateAuthProfile(auth.currentUser, { photoURL: downloadURL });
          await updateUserProfile(profileUid, { photoURL: downloadURL });
          await auth.currentUser.reload();
          await refreshProfile();

          clearPendingPhoto();
          showPhotoSaved();
          showToast('Profile photo updated!', 'success');
        } catch (error) {
          setUploadProgress(0);
          showToast('Upload failed. Try again.', 'error');
        }
      }
    );
  };

  const handleResetPassword = async () => {
    if (!auth.currentUser?.email) return;

    try {
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      showToast(`Reset email sent to ${auth.currentUser.email}`, 'success');
    } catch (error) {
      showToast('Could not send reset email.', 'error');
    }
  };

  const handleSignOut = async () => {
    const confirmed = window.confirm('Are you sure you want to sign out?');
    if (!confirmed) return;

    await signOut(auth);
    navigate('/login');
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-start',
      }}
      onMouseDown={onClose}
    >
      <div
        className="liquid-glass-strong"
        onMouseDown={(event) => event.stopPropagation()}
        style={{
          width: 'min(320px, calc(100vw - 32px))',
          marginLeft: 16,
          marginTop: 68,
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.42)',
          maxHeight: 'calc(100vh - 80px)',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={iconButtonStyle} aria-label="Close profile panel">
            <CloseIcon />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 6, marginBottom: 22 }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onMouseEnter={() => setAvatarHovered(true)}
            onMouseLeave={() => setAvatarHovered(false)}
            style={{
              position: 'relative',
              border: 'none',
              padding: 0,
              background: 'transparent',
              cursor: 'pointer',
              borderRadius: '50%',
            }}
            aria-label="Choose profile photo"
            title="Choose profile photo"
          >
            <Avatar size={60} displayName={displayName} photoURLOverride={displayPhotoURL} />
            <span
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: 'rgba(28, 25, 23, 0.7)',
                color: '#FAFAF9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: avatarHovered ? 1 : 0,
                transition: 'opacity 120ms ease',
              }}
            >
              <CameraIcon />
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoSelect}
            style={{ display: 'none' }}
          />

          {pendingPhotoFile && uploadProgress === 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                type="button"
                onClick={handleUploadPhoto}
                style={{
                  ...actionButtonStyle,
                  width: 'auto',
                  padding: '8px 12px',
                  background: '#F97316',
                  color: '#1C1917',
                  border: '1px solid #F97316',
                }}
              >
                Upload Photo
              </button>
              <button
                type="button"
                onClick={clearPendingPhoto}
                style={{
                  ...actionButtonStyle,
                  width: 'auto',
                  padding: '8px 12px',
                  background: '#3C3733',
                  color: '#A8A29E',
                  border: '1px solid #57534E',
                }}
              >
                Cancel
              </button>
            </div>
          )}

          {uploadProgress > 0 && (
            <div style={{ width: 90, marginTop: 12 }}>
              <div style={{ height: 6, background: '#3C3733', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${uploadProgress}%`, height: '100%', background: '#F97316', transition: 'width 120ms ease' }} />
              </div>
              <div style={{ color: '#A8A29E', fontFamily: 'DM Mono, monospace', fontSize: 10, marginTop: 5, textAlign: 'center' }}>
                Uploading {uploadProgress}%
              </div>
            </div>
          )}

          {photoSaved && (
            <div
              style={{
                color: '#22C55E',
                fontFamily: 'DM Mono, monospace',
                fontSize: 11,
                marginTop: 10,
              }}
            >
              {'Photo saved \u2713'}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
            {editingName ? (
              <input
                type="text"
                value={nameDraft}
                autoFocus
                onChange={(event) => setNameDraft(event.target.value)}
                onBlur={saveDisplayName}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    event.currentTarget.blur();
                  } else if (event.key === 'Escape') {
                    event.preventDefault();
                    setEditingName(false);
                    setNameDraft(displayName);
                    event.currentTarget.blur();
                  }
                }}
                style={{ ...inputStyle, width: 180, textAlign: 'center' }}
              />
            ) : (
              <>
                <div style={{ color: '#FAFAF9', fontFamily: 'DM Mono, monospace', fontSize: 16, textAlign: 'center' }}>
                  {displayName || 'Set your display name'}
                </div>
                <SavedMark visible={savedFields.displayName} />
                <button type="button" onClick={() => setEditingName(true)} style={iconButtonStyle} aria-label="Edit display name">
                  <PencilIcon />
                </button>
              </>
            )}
          </div>
          <div style={{ color: '#A8A29E', fontFamily: 'DM Mono, monospace', fontSize: 12, marginTop: 8, textAlign: 'center' }}>
            {email}
          </div>
          <div style={{ color: '#57534E', fontFamily: 'DM Mono, monospace', fontSize: 11, marginTop: 6, textAlign: 'center' }}>
            {formatMemberSince(profile.createdAt, user.metadata?.creationTime)}
          </div>
        </div>

        <section style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 2 }}>
          <div style={sectionHeadingStyle}>Profile</div>
          <EditableRow
            label="Age"
            value={profile.age === null || profile.age === undefined ? '' : String(profile.age)}
            editing={editingAge}
            draftValue={ageDraft}
            type="number"
            placeholder="Enter age"
            saved={savedFields.age}
            onStartEdit={() => setEditingAge(true)}
            onDraftChange={setAgeDraft}
            onSave={saveAge}
            onCancel={() => {
              setEditingAge(false);
              setAgeDraft(profile.age === null || profile.age === undefined ? '' : String(profile.age));
            }}
          />
        </section>

        <section style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 2, marginTop: 6 }}>
          <div style={sectionHeadingStyle}>GATE Settings</div>
          <EditableRow
            label="Exam Date"
            value={goals.gateExamDate || ''}
            editing={editingExamDate}
            draftValue={examDateDraft}
            type="date"
            saved={savedFields.gateExamDate}
            onStartEdit={() => setEditingExamDate(true)}
            onDraftChange={setExamDateDraft}
            onSave={saveExamDate}
            onCancel={() => {
              setEditingExamDate(false);
              setExamDateDraft(goals.gateExamDate || '');
            }}
          />

          <EditableRow
            label="Target Score"
            value={goals.targetScore === null || goals.targetScore === undefined ? '' : String(goals.targetScore)}
            editing={editingTargetScore}
            draftValue={targetScoreDraft}
            type="number"
            placeholder="e.g. 65"
            saved={savedFields.targetScore}
            onStartEdit={() => setEditingTargetScore(true)}
            onDraftChange={setTargetScoreDraft}
            onSave={saveTargetScore}
            onCancel={() => {
              setEditingTargetScore(false);
              setTargetScoreDraft(goals.targetScore === null || goals.targetScore === undefined ? '' : String(goals.targetScore));
            }}
          />

          <div style={{ marginBottom: 8 }}>
            <div style={{ ...fieldLabelStyle, display: 'flex', alignItems: 'center' }}>
              Daily Hours
              <SavedMark visible={savedFields.dailyHourTarget} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="range"
                min={1}
                max={12}
                value={goals.dailyHourTarget || 5}
                onChange={(event) => updateDailyHours(Number(event.target.value))}
                style={{ width: '100%', accentColor: '#F97316' }}
              />
              <span style={{ color: '#FAFAF9', fontFamily: 'DM Mono, monospace', fontSize: 12, minWidth: 34 }}>
                {goals.dailyHourTarget || 5}hr
              </span>
            </div>
          </div>
        </section>

        <section style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 2, marginTop: 14 }}>
          <div style={sectionHeadingStyle}>Account</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {isEmailUser && (
              <button
                type="button"
                onClick={handleResetPassword}
                style={{
                  ...actionButtonStyle,
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.8)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                Reset Password
              </button>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              style={{
                ...actionButtonStyle,
                background: 'rgba(248,113,113,0.08)',
                color: '#F87171',
                border: '1px solid rgba(248,113,113,0.25)',
              }}
            >
              Sign Out
            </button>
          </div>
        </section>

        <section style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 2, marginTop: 18 }}>
          <div style={{ color: '#A8A29E', fontFamily: 'DM Mono, monospace', fontSize: 11, marginTop: 16 }}>
            {'v1.0.0 \u00B7 Built for GATE CS'}
          </div>
          <div style={{ color: '#78716C', fontFamily: 'DM Mono, monospace', fontSize: 11, marginTop: 6 }}>
            Your data is private & secured.
          </div>
        </section>
      </div>
    </div>
  );
}
