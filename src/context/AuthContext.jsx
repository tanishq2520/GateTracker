import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, startSessionTimer } from '../firebase/config';
import { initUserProfile } from '../firebase/userProfile';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);

      if (nextUser) {
        startSessionTimer();
        initUserProfile(nextUser).catch((err) => {
          console.error('Failed to initialize user profile:', err);
        });
      } else if (window._sessionTimer) {
        clearTimeout(window._sessionTimer);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    const events = ['click', 'keydown', 'scroll', 'mousemove'];
    const reset = () => startSessionTimer();

    events.forEach((eventName) => window.addEventListener(eventName, reset));
    return () => events.forEach((eventName) => window.removeEventListener(eventName, reset));
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
