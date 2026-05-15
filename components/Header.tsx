
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, signInWithGoogle, logOut } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { syncUserToFirestore, testFirestoreConnection } from '../services/firebaseService';
import { Settings as SettingsIcon } from 'lucide-react';

const Header: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    testFirestoreConnection();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        syncUserToFirestore(u);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      alert("Login failed. Please try again.");
    }
  };

  return (
    <header className="main-header">
      <div className="header-content">
        <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
           <i className="bi bi-calculator-fill"></i>
           <span>Finance Pro</span>
        </div>
        <div className="auth-section d-flex align-items-center gap-3">
          {loading ? (
            <div className="loader-sm"></div>
          ) : user ? (
            <div className="user-profile" onClick={() => navigate('/settings')}>
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || ''} className="user-avatar" referrerPolicy="no-referrer" />
              ) : (
                <div className="user-avatar-placeholder">
                  {user.displayName?.charAt(0) || user.email?.charAt(0)}
                </div>
              )}
              <span className="user-name d-none d-sm-inline">{user.displayName || 'User'}</span>
            </div>
          ) : (
            <button className="login-btn" onClick={handleLogin}>
              <i className="bi bi-google"></i> Login
            </button>
          )}
          
          <button 
            className="btn btn-link p-0 text-white opacity-75 hover-opacity-100" 
            onClick={() => navigate('/settings')}
            aria-label="Settings"
          >
            <SettingsIcon size={22} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
