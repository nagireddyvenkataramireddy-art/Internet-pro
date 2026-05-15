
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, logOut } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Settings as SettingsIcon, LogOut, Shield, ChevronRight, User as UserIcon, HelpCircle } from 'lucide-react';

const Settings: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to logout?")) {
      await logOut();
      navigate('/');
    }
  };

  return (
    <div className="container py-4">
      <div className="card shadow-sm p-4 mb-4">
        <div className="d-flex align-items-center mb-4">
          <SettingsIcon size={24} className="text-primary me-2" />
          <h2 className="mb-0 h4">App Settings</h2>
        </div>

        {user ? (
          <div className="card bg-light border-0 p-3 mb-4">
            <div className="d-flex align-items-center">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="rounded-circle me-3" style={{ width: '50px', height: '50px' }} referrerPolicy="no-referrer" />
              ) : (
                <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '50px', height: '50px' }}>
                  <UserIcon size={24} />
                </div>
              )}
              <div>
                <h5 className="mb-0">{user.displayName || 'Finance Pro User'}</h5>
                <p className="text-muted mb-0 small">{user.email}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="alert alert-info py-2 px-3 small mb-4">
            Login to sync your records with the cloud.
          </div>
        )}

        <div className="list-group list-group-flush border-top border-bottom mb-4">
          <button 
            onClick={() => navigate('/privacy')}
            className="list-group-item list-group-item-action d-flex align-items-center justify-content-between py-3 px-1"
          >
            <div className="d-flex align-items-center">
              <Shield size={20} className="text-muted me-3" />
              <span>Privacy Policy</span>
            </div>
            <ChevronRight size={18} className="text-muted" />
          </button>

          <button 
            className="list-group-item list-group-item-action d-flex align-items-center justify-content-between py-3 px-1"
            onClick={() => alert("Interest Calculator Pro v1.0.0\nMade with ❤️ for Indus Appstore.")}
          >
            <div className="d-flex align-items-center">
              <HelpCircle size={20} className="text-muted me-3" />
              <span>About & Help</span>
            </div>
            <ChevronRight size={18} className="text-muted" />
          </button>
        </div>

        {user && (
          <button 
            onClick={handleLogout}
            className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center py-2"
          >
            <LogOut size={18} className="me-2" />
            Logout
          </button>
        )}
      </div>

      <div className="text-center text-muted small mt-4">
        <p>© 2026 Interest Calculator Pro</p>
      </div>
    </div>
  );
};

export default Settings;
