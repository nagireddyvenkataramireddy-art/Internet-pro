import React, { useState, useEffect } from 'react';
import { getRecords, saveRecords, getDeletedIds, clearDeletedIds, getLastSyncTime, setLastSyncTime } from '../services/storage';

const GoogleSync: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    checkAuthStatus();
    
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setIsAuthenticated(true);
        setMessage('Connected to Google Drive!');
        setTimeout(() => setMessage(''), 3000);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/status');
      const data = await response.json();
      setIsAuthenticated(data.isAuthenticated);
    } catch (error) {
      console.error('Auth status check failed:', error);
    }
  };

  const handleConnect = async () => {
    try {
      const response = await fetch('/api/auth/google/url');
      const { url } = await response.json();
      window.open(url, 'google_auth_popup', 'width=600,height=700');
    } catch (error) {
      console.error('Failed to get auth URL:', error);
      alert('Failed to connect to Google. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setIsAuthenticated(false);
      setMessage('Logged out successfully.');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleBackup = async () => {
    setIsSyncing(true);
    setMessage('Syncing with Google Drive...');
    const syncStartTime = new Date().toISOString();
    
    try {
      const lastSync = getLastSyncTime();
      const allRecords = getRecords();
      const deletedIds = getDeletedIds();
      
      // Filter records updated since last sync
      const changedRecords = allRecords.filter(r => !r.updatedAt || r.updatedAt > lastSync);
      
      const isFullBackup = lastSync === '1970-01-01T00:00:00.000Z';

      const response = await fetch('/api/sync/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          data: isFullBackup ? allRecords : changedRecords,
          deletedIds: isFullBackup ? [] : deletedIds,
          isIncremental: !isFullBackup
        }),
      });
      
      if (response.ok) {
        setLastSyncTime(syncStartTime);
        clearDeletedIds();
        setMessage('Sync successful!');
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      console.error('Backup error:', error);
      setMessage('Sync failed. Please try again.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleRestore = async () => {
    if (!window.confirm('This will overwrite your current local records with the backup from Google Drive. Continue?')) {
      return;
    }

    setIsSyncing(true);
    setMessage('Restoring from Google Drive...');
    try {
      const response = await fetch('/api/sync/download');
      if (response.ok) {
        const { data } = await response.json();
        saveRecords(data);
        setMessage('Restore successful! Refreshing...');
        setTimeout(() => window.location.reload(), 1500);
      } else if (response.status === 404) {
        setMessage('No backup found on Google Drive.');
      } else {
        throw new Error('Restore failed');
      }
    } catch (error) {
      console.error('Restore error:', error);
      setMessage('Restore failed. Please try again.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div className="google-sync-container" style={{
      padding: '15px',
      backgroundColor: '#fff',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      marginBottom: '20px',
      border: '1px solid #e0e0e0'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="bi bi-google" style={{ color: '#4285F4', fontSize: '20px' }}></i>
          <span style={{ fontWeight: '700', color: '#333' }}>Google Drive Backup</span>
        </div>
        {isAuthenticated ? (
          <button 
            onClick={handleLogout}
            style={{ 
              fontSize: '11px', 
              background: 'none', 
              border: 'none', 
              color: '#d32f2f', 
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Logout
          </button>
        ) : null}
      </div>

      {!isAuthenticated ? (
        <div style={{ textAlign: 'center', padding: '10px' }}>
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
            Connect your Google account to backup and sync your records across devices.
          </p>
          <button 
            onClick={handleConnect}
            className="btn"
            style={{ 
              background: '#4285F4', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '10px',
              margin: '0 auto'
            }}
          >
            <i className="bi bi-google"></i> Connect Google Drive
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button 
              onClick={handleBackup}
              disabled={isSyncing}
              className="btn"
              style={{ 
                background: '#2e7d32', 
                color: 'white', 
                fontSize: '14px',
                padding: '10px',
                opacity: isSyncing ? 0.7 : 1
              }}
            >
              <i className="bi bi-cloud-upload"></i> Backup Now
            </button>
            <button 
              onClick={handleRestore}
              disabled={isSyncing}
              className="btn"
              style={{ 
                background: '#1565c0', 
                color: 'white', 
                fontSize: '14px',
                padding: '10px',
                opacity: isSyncing ? 0.7 : 1
              }}
            >
              <i className="bi bi-cloud-download"></i> Restore
            </button>
          </div>
        </div>
      )}

      {message && (
        <div style={{ 
          marginTop: '10px', 
          fontSize: '12px', 
          textAlign: 'center', 
          color: message.includes('failed') ? '#d32f2f' : '#2e7d32',
          fontWeight: '600',
          padding: '4px',
          backgroundColor: message.includes('failed') ? '#ffebee' : '#e8f5e9',
          borderRadius: '4px'
        }}>
          {message}
        </div>
      )}
    </div>
  );
};

export default GoogleSync;
