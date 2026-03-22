import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(255,255,255,0.55)',
        fontFamily: 'var(--font-mono)',
        fontSize: '14px',
        position: 'relative',
        zIndex: 1,
      }}>
        Loading...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return children;
};

export default ProtectedRoute;
