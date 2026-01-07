import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import CodeEditor from '../components/Editor';
import AnalyticsCharts from '../components/AnalyticsCharts';
import { OptimizationLevel, OptimizationResult } from '../types';
import { optimizeWithRules } from '../services/ruleBasedService';
import { optimizeWithAI } from '../services/geminiService';
import { mockDb } from '../mockStorage';
import { Zap, Play, ChevronRight, Info, CheckCircle2, RefreshCw, Cpu, BrainCircuit, Terminal, Activity, ListChecks, Bookmark, Edit2 } from 'lucide-react';

const STARTER_CODE = `def hello_world(name) # Missing a colon!
    print("Hello " + name)

# This list has duplicates
my_list = [1, 1, 2, 3, 3, 4]
uniques = []
for x in my_list:
    if x not in uniques:
        uniques.append(x)`;

const OptimizePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [userCode, setUserCode] = useState(STARTER_CODE);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<OptimizationLevel>(OptimizationLevel.LEVEL_1);
  const [projectName, setProjectName] = useState('New Session');
  const [isRenaming, setIsRenaming] = useState(false);
  const [tempName, setTempName] = useState('New Session');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasJustSaved, setHasJustSaved] = useState(false);
  
  const [currentTab, setCurrentTab] = useState<'explanation' | 'metrics' | 'changes'>('explanation');

  useEffect(() => {
    const projectId = searchParams.get('id');
    if (projectId) {
        const savedData = mockDb.getById(projectId);
        if (savedData) {
            setUserCode(savedData.originalCode);
            setOptimizationResult(savedData);
            setSelectedLevel(savedData.level);
            setProjectName(savedData.name || `Session-${projectId}`);
            setTempName(savedData.name || `Session-${projectId}`);
        }
    }
  }, [searchParams]);

  const handleRenameSubmit = () => {
    const finalName = tempName.trim() || 'Untitled Session';
    setProjectName(finalName);
    setIsRenaming(false);
    if (optimizationResult?.id) {
      mockDb.updateProjectName(optimizationResult.id, finalName);
    }
  };

  const handleRunOptimization = async () => {
    setIsProcessing(true);
    setHasJustSaved(false);

    try {
      let finalData: OptimizationResult;
      if (selectedLevel === OptimizationLevel.LEVEL_1) {
        finalData = optimizeWithRules(userCode);
      } else {
        finalData = await optimizeWithAI(userCode);
      }

      const existingId = optimizationResult?.id;
      const resultWithId = { 
        ...finalData, 
        id: existingId || Math.random().toString(36).substring(2, 9),
        name: projectName
      };
      
      setOptimizationResult(resultWithId);
      mockDb.saveToHistory(resultWithId);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveToProfile = () => {
    if (!optimizationResult) return;
    setIsSaving(true);
    setTimeout(() => {
        mockDb.saveToProfile(optimizationResult);
        setIsSaving(false);
        setHasJustSaved(true);
        setTimeout(() => setHasJustSaved(false), 3000);
    }, 600);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          {isRenaming ? (
            <div className="flex items-center gap-2 max-w-md">
              <input 
                autoFocus
                className="text-3xl font-bold text-white bg-[#1a1a1a] border-b-2 border-blue-500 focus:outline-none flex-1 px-2 py-1 rounded-t-lg"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSubmit();
                  if (e.key === 'Escape') {
                    setTempName(projectName);
                    setIsRenaming(false);
                  }
                }}
              />
            </div>
          ) : (
            <h1 
              onClick={() => {
                setTempName(projectName);
                setIsRenaming(true);
              }}
              className="text-3xl font-bold text-white flex items-center gap-3 cursor-pointer group hover:text-blue-400 transition-all"
            >
              {projectName}
              <Edit2 className="w-5 h-5 text-gray-700 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all" />
            </h1>
          )}
          <p className="text-gray-400 mt-2">Click title to rename. Select logic level to start.</p>
        </div>
        
        <div className="flex items-center gap-2 p-1 bg-gray-900 border border-gray-800 rounded-2xl">
          <button 
            onClick={() => setSelectedLevel(OptimizationLevel.LEVEL_1)} 
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-sm ${selectedLevel === OptimizationLevel.LEVEL_1 ? 'bg-green-600 text-white shadow-lg shadow-green-600/20' : 'text-gray-500 hover:text-white'}`}
          >
            <Cpu className="w-4 h-4" /> Level 1
          </button>
          <button 
            onClick={() => setSelectedLevel(OptimizationLevel.LEVEL_2)} 
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-sm ${selectedLevel === OptimizationLevel.LEVEL_2 ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:text-white'}`}
          >
            <BrainCircuit className="w-4 h-4" /> Level
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#111] p-3 rounded-t-2xl border-x border-t border-gray-800">
            <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><Terminal className="w-4 h-4" /> Input</span>
            <button onClick={() => setUserCode('')} className="text-xs text-red-400 hover:underline">Clear</button>
          </div>
          <CodeEditor value={userCode} onChange={(val) => setUserCode(val || '')} />
          <button 
            onClick={handleRunOptimization} 
            disabled={isProcessing} 
            className={`w-full py-4 rounded-2xl font-bold shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 text-white ${selectedLevel === OptimizationLevel.LEVEL_1 ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            {selectedLevel === OptimizationLevel.LEVEL_1 ? 'Run Syntax Check' : 'Execute AI Refactor'}
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#111] p-3 rounded-t-2xl border-x border-t border-gray-800">
            <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400" /> Results</span>
            {optimizationResult && (
              <button 
                onClick={handleSaveToProfile} 
                disabled={isSaving || hasJustSaved}
                className={`text-xs font-bold px-3 py-1 rounded-lg transition-all flex items-center gap-2 ${hasJustSaved ? 'text-green-400 bg-green-400/10 border border-green-400/20' : 'text-blue-400 hover:bg-blue-400/10'}`}
              >
                {hasJustSaved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                {hasJustSaved ? 'Saved' : 'Save to Profile'}
              </button>
            )}
          </div>
          <CodeEditor value={optimizationResult?.optimizedCode || ''} readOnly />
        </div>
      </div>

      {optimizationResult && (
        <div className="space-y-6 pt-8 border-t border-gray-800">
          <div className="flex gap-4 border-b border-gray-800">
            {[
              { id: 'explanation', label: 'Analysis', icon: Info },
              { id: 'metrics', label: 'Performance', icon: Activity },
              { id: 'changes', label: 'Diff Log', icon: ListChecks }
            ].map((tab) => (
              <button 
                key={tab.id} 
                onClick={() => setCurrentTab(tab.id as any)} 
                className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-all ${currentTab === tab.id ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500'}`}
              >
                <tab.icon className="w-4 h-4" /> {tab.label}
              </button>
            ))}
          </div>

          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            {currentTab === 'explanation' && (
              <div className="bg-[#111] border border-gray-800 rounded-2xl p-8">
                <h3 className="text-xl font-bold text-white mb-4">Code Intelligence</h3>
                <p className="text-gray-400 leading-relaxed">{optimizationResult.explanation}</p>
              </div>
            )}
            {currentTab === 'metrics' && <AnalyticsCharts metrics={optimizationResult.metrics} />}
            {currentTab === 'changes' && (
              <div className="bg-[#111] border border-gray-800 rounded-2xl p-6">
                <div className="space-y-3">
                  {optimizationResult.changes.map((change, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 bg-[#0a0a0a] border border-gray-800 rounded-xl">
                      <div className="mt-1 p-2 rounded-lg bg-blue-500/10 text-blue-400"><ChevronRight className="w-4 h-4" /></div>
                      <div>
                        <span className="text-xs font-mono text-gray-600">Line {change.line}</span>
                        <p className="text-gray-300 text-sm mt-1">{change.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OptimizePage;