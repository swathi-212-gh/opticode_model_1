import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import OptimizePage from './pages/OptimizePage';
import HistoryPage from './pages/HistoryPage';
import ProfilePage from './pages/ProfilePage';
import { mockAuth } from './mockStorage';

/**
 * THE MAIN APP COMPONENT
 */
const App: React.FC = () => {
  const [currentUserName, setCurrentUserName] = useState<string | null>(mockAuth.getUserName());

  useEffect(() => {
    const checkLoginStatus = () => setCurrentUserName(mockAuth.getUserName());
    window.addEventListener('storage', checkLoginStatus);
    return () => window.removeEventListener('storage', checkLoginStatus);
  }, []);

  const ProtectedPage = (component: React.ReactNode) => {
    if (!currentUserName) return <Navigate to="/login" />;
    return (
      <Layout user={currentUserName} onLogout={() => setCurrentUserName(null)}>
        {component}
      </Layout>
    );
  };

  return (
    <HashRouter>
      <Routes>
        {/* PUBLIC PAGES */}
        <Route path="/" element={currentUserName ? <Navigate to="/optimize" /> : <LandingPage />} />
        <Route path="/login" element={currentUserName ? <Navigate to="/optimize" /> : <LoginPage onLogin={setCurrentUserName} />} />
        
        {/* PROTECTED PAGES */}
        <Route path="/optimize" element={ProtectedPage(<OptimizePage />)} />
        <Route path="/history" element={ProtectedPage(<HistoryPage />)} />
        <Route path="/profile" element={ProtectedPage(<ProfilePage />)} />

        {/* CATCH-ALL: Redirect to optimize if logged in, otherwise landing */}
        <Route path="*" element={<Navigate to={currentUserName ? "/optimize" : "/"} />} />
      </Routes>
    </HashRouter>
  );
};

export default App;