
import React from 'react';
import { useLocation, Link } from 'react-router-dom';

const Navigation: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;

  return (
    <div className="bottom-nav">
        <Link to="/" className={path === '/' ? 'active' : ''}>Home</Link>
        <Link to="/book" className={path === '/book' ? 'active' : ''}>Book</Link>
        <Link to="/saved" className={path === '/saved' ? 'active' : ''}>Records</Link>
        <Link to="/stats" className={path === '/stats' ? 'active' : ''}>Stats</Link>
        <Link to="/tools" className={path === '/tools' ? 'active' : ''}>Tools</Link>
    </div>
  );
};

export default Navigation;
