
import React, { useState } from 'react';
import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Calculator from './components/Calculator';
import Book from './components/Book';
import Stats from './components/Stats';
import Saved from './components/Saved';
import AdvancedCalculators from './components/AdvancedCalculators';
import Navigation from './components/Navigation';
import { InterestRecord } from './types';

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const [recordToLoad, setRecordToLoad] = useState<InterestRecord | null>(null);

  const handleLoadRecord = (record: InterestRecord) => {
    setRecordToLoad(record);
    navigate('/');
  };

  const clearLoadData = () => {
    setRecordToLoad(null);
  };

  return (
    <>
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
      </Routes>
      <Navigation />
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
