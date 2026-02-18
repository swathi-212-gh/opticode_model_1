
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ShieldCheck, BarChart3, ChevronRight, Terminal, Cpu, BrainCircuit } from 'lucide-react';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-600/10 blur-[120px] pointer-events-none" />

      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg"><Terminal className="w-6 h-6 text-white" /></div>
          <span className="text-xl font-bold tracking-tight">OptiCode </span>
        </div>
        <button onClick={() => navigate('/login')} className="px-6 py-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all font-medium">Sign In</button>
      </nav>

      <section className="relative z-10 pt-20 pb-32 px-6 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <Zap className="w-4 h-4" /><span>Instant Python Enhancement</span>
        </div>
        <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]">
          Optimize Python in <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Real Time</span>
        </h1>
        <p className="text-gray-400 text-xl mb-12 max-w-2xl mx-auto leading-relaxed">The only tool that fixes your typos instantly and refactors your logic for professional speed.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button onClick={() => navigate('/login')} className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2 group">
            Start Optimizing<ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          </div>
      </section>

      <section className="relative z-10 py-24 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 bg-gradient-to-br from-gray-900 to-[#111] border border-gray-800 rounded-[32px] group hover:border-blue-500/30 transition-all">
            <Cpu className="w-14 h-14 text-green-500 mb-6" />
            <h3 className="text-2xl font-bold mb-4">Level 1: Syntax Clean</h3>
            <p className="text-gray-400 leading-relaxed mb-6">Instantly fixes missing colons, whitespace errors, and common Python beginner mistakes.</p>
            <div className="flex items-center gap-2 text-green-400 text-sm font-bold uppercase tracking-widest"><ShieldCheck className="w-4 h-4" /><span>Stability Pass</span></div>
          </div>
          <div className="p-8 bg-gradient-to-br from-gray-900 to-[#111] border border-gray-800 rounded-[32px] group hover:border-blue-500/30 transition-all">
            <BrainCircuit className="w-14 h-14 text-blue-500 mb-6" />
            <h3 className="text-2xl font-bold mb-4">Level 2: Neural Refactor</h3>
            <p className="text-gray-400 leading-relaxed mb-6">Refactors Python code by replacing costly loops with efficient built-in functions and optimized data structures.</p>
            <div className="flex items-center gap-2 text-blue-400 text-sm font-bold uppercase tracking-widest"><BarChart3 className="w-4 h-4" /><span>AI Efficiency</span></div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;