// Core React imports for state and lifecycle handling
import React, { useState, useEffect } from 'react';

// React Router imports for client-side routing
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layout wrapper that provides navbar/sidebar and logout
import Layout from './components/Layout';

// Page-level components (full screens)
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import OptimizePage from './pages/OptimizePage';
import HistoryPage from './pages/HistoryPage';
import ProfilePage from './pages/ProfilePage';

// Mock authentication helper (localStorage-based)
import { mockAuth } from './mockStorage';

// Main application component
const App: React.FC = () => {

  // Track the currently logged-in user's name
  // Initialize from mockAuth (localStorage) if already logged in
  const [currentUserName, setCurrentUserName] = useState<string | null>(
    mockAuth.getUserName()
  );

  // Listen for changes to localStorage (e.g., login/logout in another tab)
  useEffect(() => {
    const checkLoginStatus = () => {
      setCurrentUserName(mockAuth.getUserName());
    };

    window.addEventListener('storage', checkLoginStatus);

    // Cleanup listener when App unmounts
    return () => {
      window.removeEventListener('storage', checkLoginStatus);
    };
  }, []);

  // Higher-order wrapper for protected routes
  // Redirects to /login if user is not authenticated
  const ProtectedPage = (component: React.ReactNode) => {
    if (!currentUserName) {
      return <Navigate to="/login" />;
    }

    // If authenticated, wrap page inside the shared Layout
    return (
      <Layout
        user={currentUserName}
        onLogout={() => setCurrentUserName(null)} // Clear user on logout
      >
        {component}
      </Layout>
    );
  };

  return (
    // HashRouter is used instead of BrowserRouter
    // Useful for GitHub Pages / static hosting
    <HashRouter>
      <Routes>

        {/* ================= PUBLIC ROUTES ================= */}

        {/* Root route:
            - If logged in → redirect to Optimize page
            - Else → show Landing page */}
        <Route
          path="/"
          element={
            currentUserName
              ? <Navigate to="/optimize" />
              : <LandingPage />
          }
        />

        {/* Login route:
            - If already logged in → redirect to Optimize
            - Else → show Login page
            - Pass setCurrentUserName so LoginPage can update state on success */}
        <Route
          path="/login"
          element={
            currentUserName
              ? <Navigate to="/optimize" />
              : <LoginPage onLogin={setCurrentUserName} />
          }
        />

        {/* ================= PROTECTED ROUTES ================= */}

        {/* Core optimization page (requires login) */}
        <Route
          path="/optimize"
          element={ProtectedPage(<OptimizePage />)}
        />

        {/* History page (requires login) */}
        <Route
          path="/history"
          element={ProtectedPage(<HistoryPage />)}
        />

        {/* User profile page (requires login) */}
        <Route
          path="/profile"
          element={ProtectedPage(<ProfilePage />)}
        />

        {/* ================= FALLBACK ROUTE ================= */}

        {/* Catch-all:
            - If logged in → redirect to Optimize
            - Else → redirect to Landing */}
        <Route
          path="*"
          element={
            <Navigate to={currentUserName ? "/optimize" : "/"} />
          }
        />

      </Routes>
    </HashRouter>
  );
};

export default App;
