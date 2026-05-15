
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Calculator from './components/Calculator';
import Book from './components/Book';
import Stats from './components/Stats';
import Saved from './components/Saved';
import AdvancedCalculators from './components/AdvancedCalculators';
import Privacy from './components/Privacy';
import Settings from './components/Settings';
import Navigation from './components/Navigation';
import Header from './components/Header';
import { InterestRecord } from './types';
import { auth } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { subscribeToRecords } from './services/firebaseService';
import { saveRecords } from './services/storage';

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [recordToLoad, setRecordToLoad] = useState<InterestRecord | null>(null);

  const isPrivacyPage = location.pathname === '/privacy';
  const isSettingsPage = location.pathname === '/settings';

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Subscribe to cloud records and sync to local storage
        const unsubscribeRecords = subscribeToRecords(user.uid, (cloudRecords) => {
          saveRecords(cloudRecords);
          // Force a re-render or trigger local storage updates if components listen to it
          // Since records are usually read on component mount, we might need a context or state
          // For now, saveRecords updates localStorage.
        });
        return () => unsubscribeRecords();
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleLoadRecord = (record: InterestRecord) => {
    setRecordToLoad(record);
    navigate('/');
  };

  const clearLoadData = () => {
    setRecordToLoad(null);
  };

  return (
    <>
      {!isPrivacyPage && <Header />}
      <Routes>
        <Route 
          path="/" 
          element={
            <Calculator 
              loadData={recordToLoad} 
              onClearLoadData={clearLoadData} 
            />
          } 
        />
        <Route 
          path="/book" 
          element={<Book onLoadRecord={handleLoadRecord} />} 
        />
        <Route path="/stats" element={<Stats />} />
        <Route 
          path="/saved" 
          element={<Saved onLoadRecord={handleLoadRecord} />} 
        />
        {/* /emi kept for backward compat if needed, but UI points to /tools */}
        <Route path="/tools" element={<AdvancedCalculators />} />
        <Route path="/emi" element={<AdvancedCalculators />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
      {(!isPrivacyPage && !isSettingsPage) && <Navigation />}
    </>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
};

export default App;
