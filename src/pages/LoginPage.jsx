import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

const inputStyle = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: 'rgba(255,255,255,0.9)',
  borderRadius: 8,
  padding: '10px 14px',
  width: '100%',
  fontFamily: 'var(--font-body)',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};

const GoogleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.2-1.4 3.6-5.5 3.6-3.3 0-6-2.8-6-6.2s2.7-6.2 6-6.2c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 2.7 14.7 2 12 2 6.9 2 2.8 6.3 2.8 11.5S6.9 21 12 21c6.9 0 8.6-4.9 8.6-7.5 0-.5 0-.9-.1-1.3H12Z" />
    <path fill="#34A853" d="M3.9 7.3l3.2 2.3c.8-2.2 2.9-3.8 4.9-3.8 1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 2.7 14.7 2 12 2 8.1 2 4.8 4.2 3.2 7.4l.7-.1Z" />
    <path fill="#FBBC05" d="M3.2 7.4A9.8 9.8 0 0 0 2.8 11.5c0 1.4.3 2.8.9 4.1l3.4-2.6a6.4 6.4 0 0 1 0-3.9L3.2 7.4Z" />
    <path fill="#4285F4" d="M12 21c2.7 0 4.9-.9 6.5-2.4l-3-2.4c-.8.6-1.9 1-3.5 1-2 0-4.1-1.5-4.9-3.7l-3.4 2.6C4.8 18.8 8.1 21 12 21Z" />
  </svg>
);

const LoginPage = () => {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [authLoading, user, navigate]);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill all fields.'); return; }
    if (mode === 'signup' && password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (mode === 'signup' && password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      const messages = {
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/email-already-in-use': 'An account with this email already exists.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/invalid-credential': 'Incorrect email or password.',
      };
      setError(messages[err.code] || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/dashboard');
    } catch {
      setError('Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const focusBorder = (e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; };
  const blurBorder  = (e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        boxSizing: 'border-box',
      }}
    >
      <div
        className="liquid-glass-strong animate-fade-rise"
        style={{
          borderRadius: 20,
          padding: 40,
          width: '100%',
          maxWidth: 400,
          boxSizing: 'border-box',
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 32,
            color: 'rgba(255,255,255,0.95)',
            letterSpacing: '-0.02em',
            marginBottom: 4,
          }}
        >
          GATE CS Tracker
        </div>
        <div
          style={{
            color: 'rgba(255,255,255,0.35)',
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            marginBottom: 28,
          }}
        >
          Your honest study companion
        </div>

        {/* Mode label */}
        <div
          style={{
            color: 'rgba(255,255,255,0.8)',
            fontFamily: 'var(--font-body)',
            fontSize: 16,
            fontWeight: 500,
            marginBottom: 18,
          }}
        >
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </div>

        <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={focusBorder}
            onBlur={blurBorder}
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={focusBorder}
            onBlur={blurBorder}
            style={inputStyle}
          />
          {mode === 'signup' && (
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onFocus={focusBorder}
              onBlur={blurBorder}
              style={inputStyle}
            />
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              borderRadius: 8,
              padding: '10px 14px',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              cursor: loading ? 'not-allowed' : 'pointer',
              border: '1px solid rgba(249,115,22,0.4)',
              background: 'rgba(249,115,22,0.85)',
              backdropFilter: 'blur(8px)',
              color: '#fff',
              fontWeight: 600,
              marginTop: 4,
              opacity: loading ? 0.7 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            color: 'rgba(255,255,255,0.2)',
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            margin: '16px 0',
          }}
        >
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
          <span>or</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="liquid-glass"
          style={{
            width: '100%',
            borderRadius: 8,
            padding: '10px 14px',
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            cursor: loading ? 'not-allowed' : 'pointer',
            color: 'rgba(255,255,255,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            opacity: loading ? 0.7 : 1,
            border: 'none',
          }}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        {error && (
          <div
            style={{
              color: '#F87171',
              fontFamily: 'var(--font-body)',
              fontSize: 11,
              marginTop: 14,
              minHeight: 16,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={() => { setMode((p) => (p === 'login' ? 'signup' : 'login')); setError(''); }}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: '#F97316',
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            cursor: 'pointer',
            marginTop: 14,
            display: 'block',
          }}
        >
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
