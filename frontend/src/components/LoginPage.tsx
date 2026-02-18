import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Terminal, Lock, Mail, ChevronRight, User } from "lucide-react";

interface LoginPageProps {
  onLogin?: (name: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleAuth = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);

    const endpoint = isSignup ? "/api/signup" : "/api/login";
    const payload = isSignup ? { name, email, password } : { email, password };

    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (response.ok) {
        if (onLogin) onLogin(data.name || name); // Save user in React state
        navigate("/optimize"); // Go to optimizer page
      } else {
        alert(data.error || "Authentication failed");
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 bg-blue-600 rounded-3xl mb-6 shadow-2xl shadow-blue-600/30">
            <Terminal className="text-white w-8 h-8" />
          </div>

          <h1 className="text-4xl font-extrabold text-white mb-2">
            {isSignup ? "Create Account" : "Welcome Back"}
          </h1>

          <p className="text-gray-500">
            {isSignup ? "Join the platform" : "Log in to continue"}
          </p>
        </div>

        <div className="bg-[#111]/80 border border-white/5 p-8 rounded-[40px] shadow-2xl backdrop-blur-2xl">
          <form onSubmit={handleAuth} className="space-y-5">

            {isSignup && (
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">
                  Full Name
                </label>

                <div className="relative">
                  <User className="absolute left-4 top-3.5 text-gray-600 w-5 h-5" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">
                Email
              </label>

              <div className="relative">
                <Mail className="absolute left-4 top-3.5 text-gray-600 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">
                Password
              </label>

              <div className="relative">
                <Lock className="absolute left-4 top-3.5 text-gray-600 w-5 h-5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2"
            >
              {loading
                ? "Processing..."
                : isSignup
                ? "Create Account"
                : "Sign In"}

              <ChevronRight className="w-5 h-5" />
            </button>
          </form>

          <button
            onClick={() => setIsSignup(!isSignup)}
            className="w-full text-gray-400 hover:text-white text-sm font-medium mt-6"
          >
            {isSignup
              ? "Already have an account? Sign in"
              : "Don't have an account? Create one"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
