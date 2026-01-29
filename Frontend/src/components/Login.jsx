import { useState, useRef, useEffect } from "react";
import api from "../api";

const Login = ({ onLogin }) => {
  const [selectedUsername, setSelectedUsername] = useState("");
  const [password, setPassword] = useState("");
  const [users, setUsers] = useState([]);

  // Refs for keyboard navigation
  const userRef = useRef(null);
  const passRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get("/users");
        if (!mounted) return;
        setUsers(data || []);
        if (data && data.length === 1) setSelectedUsername(data[0].username);
      } catch (e) {
        console.error("Failed to load users for login:", e);
      }
    })();
    return () => { mounted = false };
  }, []);

  const handleLogin = async () => {
    try {
      const { data } = await api.post("/auth/login", { username: selectedUsername, password });
      const { token, user } = data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      onLogin(user);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Login failed");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 relative overflow-hidden">
      {/* Animated background circles */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-white opacity-10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-white opacity-10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-white opacity-5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      
      <div className="backdrop-blur-lg bg-white/10 p-10 rounded-3xl shadow-2xl w-full max-w-md border border-white/20 transform transition duration-500 hover:scale-105">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-white/20 rounded-full mb-4">
            <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h2 className="text-4xl font-bold text-white mb-2">Zam Zam Pharmacy</h2>
          <p className="text-white/80 text-sm">Enter your credentials to continue</p>
        </div>

        {/* User selector */}
        <div className="mb-5">
          <label className="block text-white font-semibold mb-2">User</label>
          <div className="relative">
            <select
              ref={userRef}
              value={selectedUsername}
              onChange={(e) => { setSelectedUsername(e.target.value); setTimeout(() => passRef.current?.focus(), 0); }}
              className="w-full p-3 pr-10 bg-white/10 border border-white/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent backdrop-blur-sm transition appearance-none"
            >
              <option value="" disabled hidden className="text-gray-400">Select your user ID</option>
              {users.map((u) => (
                <option key={u.id} value={u.username}>{u.cnic_name || u.username}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Password */}
        <div className="mb-6">
          <label className="block text-white font-semibold mb-2">Password</label>
          <input
            ref={passRef}
            type="password"
            placeholder="Enter your password"
            className="w-full p-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent backdrop-blur-sm transition"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleLogin();
              }
            }}
          />
        </div>

        {/* Login Button */}
        <button
          onClick={handleLogin}
          disabled={!selectedUsername}
          className="w-full bg-white text-purple-600 py-3 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50"
        >
          Login
        </button>
        
        
      </div>
    </div>
  );
};

export default Login;
