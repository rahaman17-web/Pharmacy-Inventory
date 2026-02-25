import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login.jsx";
import Dashboard from "./components/Dashboard.jsx";
import api from "./api";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Validate token on app start
  useEffect(() => {
    const validateSession = async () => {
      try {
        const token = localStorage.getItem("token");
        const storedUser = localStorage.getItem("user");
        
        if (!token || !storedUser) {
          setLoading(false);
          return;
        }

        // Verify token is still valid by making a test API call
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        await api.get("/auth/verify");
        setUser(JSON.parse(storedUser));
      } catch (err) {
        // Token is invalid or expired, clear everything
        console.log("Session invalid, please login again");
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    validateSession();
  }, []);

  const handleLogin = (loggedInUser, token) => {
    localStorage.setItem("user", JSON.stringify(loggedInUser));
    localStorage.setItem("token", token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="min-h-screen">
        <Routes>
          <Route 
            path="/login" 
            element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/*" 
            element={user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
