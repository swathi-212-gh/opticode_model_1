import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import LandingPage from "./components/LandingPage";
import LoginPage from "./components/LoginPage";
import OptimizePage from "./components/OptimizePage";
import ProfilePage from "./components/ProfilePage";
import Layout from "./components/Layout";

function App() {
  const [user, setUser] = useState<string>(() => {
    // Rehydrate from localStorage on first load
    try {
      const raw = localStorage.getItem("opticode_user");
      if (!raw) return "";
      const parsed = JSON.parse(raw);
      if (typeof parsed === "string") return parsed;
      return parsed.username || parsed.email || "";
    } catch {
      return "";
    }
  });

  const handleLogout = () => {
    localStorage.removeItem("opticode_user");
    setUser("");
  };

  const handleLogin = (username: string) => {
    setUser(username);
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes — no Layout */}
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={
            user
              ? <Navigate to="/optimize" replace />
              : <LoginPage onLogin={handleLogin} />
          }
        />

        {/* Protected routes — wrapped in Layout */}
        <Route
          path="/optimize"
          element={
            user
              ? (
                <Layout user={user} onLogout={handleLogout}>
                  <OptimizePage />
                </Layout>
              )
              : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/profile"
          element={
            user
              ? (
                <Layout user={user} onLogout={handleLogout}>
                  <ProfilePage />
                </Layout>
              )
              : <Navigate to="/login" replace />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;