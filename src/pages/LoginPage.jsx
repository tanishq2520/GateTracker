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
  background: '#3C3733',
  border: '1px solid #57534E',
  color: '#FAFAF9',
  borderRadius: 6,
  padding: '10px 14px',
  width: '100%',
  fontFamily: 'DM Mono, monospace',
  fontSize: 12,
  outline: 'none',
  boxSizing: 'border-box',
};

const buttonStyle = {
  width: '100%',
  borderRadius: 6,
  padding: '10px 14px',
  fontFamily: 'DM Mono, monospace',
  fontSize: 12,
  cursor: 'pointer',
  border: 'none',
  transition: 'opacity 0.2s ease',
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

    if (!email || !password) {
      setError('Please fill all fields.');
      return;
    }
    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (mode === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

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
    } catch (err) {
      setError('Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const focusBorder = (e) => {
    e.currentTarget.style.borderColor = '#F97316';
  };

  const blurBorder = (e) => {
    e.currentTarget.style.borderColor = '#57534E';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1C1917',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      boxSizing: 'border-box',
    }}>
      <div style={{
        background: '#292524',
        border: '1px solid #44403C',
        borderRadius: 12,
        padding: 40,
        width: '100%',
        maxWidth: 400,
        boxSizing: 'border-box',
      }}>
        <div style={{ color: '#F97316', fontFamily: 'DM Mono, monospace', fontSize: 13, letterSpacing: '0.12em', marginBottom: 8 }}>
          GATE CS TRACKER
        </div>
        <div style={{ color: '#57534E', fontFamily: 'DM Mono, monospace', fontSize: 11, marginBottom: 28 }}>
          Your honest study companion
        </div>

        <div style={{ color: '#FAFAF9', fontFamily: 'DM Sans, sans-serif', fontSize: 20, fontWeight: 600, marginBottom: 20 }}>
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </div>

        <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
              ...buttonStyle,
              background: '#F97316',
              color: '#1C1917',
              fontWeight: 700,
              marginTop: 4,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          color: '#57534E',
          fontFamily: 'DM Mono, monospace',
          fontSize: 11,
          margin: '18px 0',
        }}>
          <div style={{ flex: 1, height: 1, background: '#44403C' }} />
          <span>or</span>
          <div style={{ flex: 1, height: 1, background: '#44403C' }} />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          style={{
            ...buttonStyle,
            background: '#3C3733',
            color: '#FAFAF9',
            border: '1px solid #57534E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            opacity: loading ? 0.7 : 1,
          }}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div style={{ minHeight: 20, color: '#EF4444', fontFamily: 'DM Mono, monospace', fontSize: 11, marginTop: 14 }}>
          {error}
        </div>

        <button
          type="button"
          onClick={() => {
            setMode((prev) => (prev === 'login' ? 'signup' : 'login'));
            setError('');
          }}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: '#F97316',
            fontFamily: 'DM Mono, monospace',
            fontSize: 11,
            cursor: 'pointer',
            marginTop: 12,
          }}
        >
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
