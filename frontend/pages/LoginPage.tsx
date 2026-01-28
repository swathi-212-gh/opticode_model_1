
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal, Lock, Mail, ChevronRight, User, Play } from 'lucide-react';
import { mockAuth } from '../mockStorage';

interface LoginPageProps {
  onLogin: (email: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = (e?: React.FormEvent, demoName?: string) => {
    if (e) e.preventDefault();
    setLoading(true);
    
    const finalName = demoName || name || email.split('@')[0] || 'User';
    
    // Simulate a network delay
    setTimeout(() => {
      mockAuth.login(finalName, email);
      onLogin(finalName);
      // Redirecting straight to Optimizer for faster workflow
      navigate('/optimize');
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
      
      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="inline-flex items-center justify-center p-4 bg-blue-600 rounded-3xl mb-6 shadow-2xl shadow-blue-600/30">
            <Terminal className="text-white w-8 h-8" />
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">
            {isSignup ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-gray-500 font-medium">
            {isSignup ? 'Join the next generation of developers' : 'Log in to continue your work'}
          </p>
        </div>

        <div className="bg-[#111]/80 border border-white/5 p-8 rounded-[40px] shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-500">
          <form onSubmit={(e) => handleAuth(e)} className="space-y-5">
            {isSignup && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 text-gray-600 w-5 h-5" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600/40 transition-all"
                    placeholder="E.g. John Doe"
                    required={isSignup}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 text-gray-600 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600/40 transition-all"
                  placeholder="demo@opticode.ai"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 text-gray-600 w-5 h-5" />
                <input
                  type="password"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600/40 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 mt-4"
            >
              {loading ? 'Processing...' : isSignup ? 'Create Account' : 'Sign In'}
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="relative my-8">
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setIsSignup(!isSignup)}
              className="w-full text-gray-400 hover:text-white text-sm font-medium transition-colors"
            >
              {isSignup ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
            </button>

          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
