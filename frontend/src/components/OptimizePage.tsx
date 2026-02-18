import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import CodeEditor from '../components/CodeEditor';
import {
  Zap, Play, ChevronRight, Info, CheckCircle2, RefreshCw,
  Cpu, BrainCircuit, Terminal, AlertTriangle, ShieldCheck,
  Bookmark, Edit2, ListChecks,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type OptimizationLevel = 'level1' | 'level2';

interface PipelineResult {
  passed_error_check: boolean;
  passed_complexity:  boolean;
  optimization_ran:   boolean;
  error_report: {
    language?:      { is_python: boolean; reason: string };
    syntax?:        string;
    security?:      string[];
    runtime_risks?: string[];
    optimization?:  { findings: { type: string; line: number; suggestion: string }[] };
  };
  original_analysis:  Record<string, any>;
  optimized_analysis: Record<string, any>;
  original_code:      string;
  optimized_code:     string;
  optimization_level: string;
  l1_changes:         string[];
  l2: {
    winning_model:          string;
    score:                  number;
    confidence:             number;
    risk:                   string;
    changes_applied:        string[];
    additional_suggestions: string[];
    ranked_models: {
      model: string; score: number; confidence: number;
      risk: string; syntax_ok: boolean; latency_ms: number;
    }[];
    syntax_valid: boolean;
  };
  error: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STARTER_CODE = `def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

def find_duplicates(arr):
    duplicates = []
    for i in range(len(arr)):
        for j in range(i + 1, len(arr)):
            if arr[i] == arr[j] and arr[i] not in duplicates:
                duplicates.append(arr[i])
    return duplicates`;

const API_BASE = 'http://localhost:5000';
const NO_CHANGE_SENTINEL = 'no rule-based optimizations applicable';

// ─────────────────────────────────────────────────────────────────────────────
// API helpers
// ─────────────────────────────────────────────────────────────────────────────

async function runAnalysis(code: string, level: OptimizationLevel): Promise<PipelineResult> {
  const res = await fetch(`${API_BASE}/api/analyse`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ code, optimization_level: level }),
  });
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  return res.json();
}

async function saveSessionToDB(payload: object): Promise<string> {
  const res = await fetch(`${API_BASE}/api/sessions`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error((e as any).error || `Save failed: ${res.status}`);
  }
  return (await res.json()).id as string;
}

async function renameSessionInDB(id: string, name: string): Promise<void> {
  await fetch(`${API_BASE}/api/sessions/item/${id}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ name }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function getLoggedInUser(): { email: string; name: string } {
  try {
    const raw = localStorage.getItem('opticode_user');
    if (!raw) return { email: '', name: '' };
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') return { email: parsed, name: parsed };
    return { email: parsed.email || '', name: parsed.name || '' };
  } catch {
    return { email: '', name: '' };
  }
}

function hasRealL1Changes(changes: string[]): boolean {
  if (!changes?.length) return false;
  return !changes.every((c) => c.toLowerCase().includes(NO_CHANGE_SENTINEL));
}

function hasRealL2(l2: PipelineResult['l2']): boolean {
  return !!(l2?.winning_model && (l2.changes_applied?.length ?? 0) > 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const OptimizePage: React.FC = () => {
  const [searchParams] = useSearchParams();

  const [userCode,       setUserCode]       = useState(STARTER_CODE);
  const [result,         setResult]         = useState<PipelineResult | null>(null);
  const [selectedLevel,  setSelectedLevel]  = useState<OptimizationLevel>('level1');
  const [projectName,    setProjectName]    = useState('New Session');
  const [isRenaming,     setIsRenaming]     = useState(false);
  const [tempName,       setTempName]       = useState('New Session');
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const [isProcessing,   setIsProcessing]   = useState(false);
  const [isSaving,       setIsSaving]       = useState(false);
  const [saveStatus,     setSaveStatus]     = useState<'idle' | 'saved' | 'error'>('idle');
  const [apiError,       setApiError]       = useState<string | null>(null);

  const renameCancelledRef = useRef(false);

  // ── Load session from URL ───────────────────────────────────────────────────
  useEffect(() => {
    const sessionParam = searchParams.get('session');
    if (!sessionParam) return;
    const stored = localStorage.getItem('opticode_open_session');
    if (!stored) return;
    try {
      const session = JSON.parse(stored);
      if (session.id === sessionParam) {
        setUserCode(session.original_code || '');
        setProjectName(session.name || 'Loaded Session');
        setTempName(session.name || 'Loaded Session');
        setSavedSessionId(session.id);
        if (session.original_analysis) {
          setResult({
            passed_error_check: true,
            passed_complexity:  true,
            optimization_ran:   true,
            error_report:       session.error_report || {},
            original_analysis:  session.original_analysis,
            optimized_analysis: session.optimized_analysis || session.original_analysis,
            original_code:      session.original_code || '',
            optimized_code:     session.optimized_code || '',
            optimization_level: session.optimization_level || 'level1',
            l1_changes:         session.l1_changes || [],
            l2: session.l2 || {
              winning_model: '', score: 0, confidence: 0, risk: '',
              changes_applied: [], additional_suggestions: [],
              ranked_models: [], syntax_valid: false,
            },
            error: null,
          });
        }
        localStorage.removeItem('opticode_open_session');
      }
    } catch { /* ignore */ }
  }, [searchParams]);

  // ── Rename helpers ──────────────────────────────────────────────────────────
  const commitRename = async (name: string) => {
    const finalName = name.trim() || 'Untitled Session';
    setProjectName(finalName);
    setIsRenaming(false);
    if (savedSessionId) {
      try { await renameSessionInDB(savedSessionId, finalName); } catch { }
    }
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      renameCancelledRef.current = false;
      commitRename(tempName);
    } else if (e.key === 'Escape') {
      renameCancelledRef.current = true;
      setTempName(projectName);
      setIsRenaming(false);
    }
  };

  const handleRenameBlur = () => {
    if (renameCancelledRef.current) { renameCancelledRef.current = false; return; }
    commitRename(tempName);
  };

  // ── Run ─────────────────────────────────────────────────────────────────────
  const handleRun = async () => {
    if (!userCode.trim()) return;
    setIsProcessing(true);
    setApiError(null);
    setResult(null);
    setSavedSessionId(null);
    setSaveStatus('idle');
    try {
      const data = await runAnalysis(userCode, selectedLevel);
      setResult(data);
      if (data.error) setApiError(data.error);
    } catch (e: any) {
      setApiError(e.message || 'Failed to reach the server. Is the backend running?');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!result) return;
    const { email } = getLoggedInUser();
    if (!email) { setApiError('You must be logged in to save sessions.'); return; }
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      const id = await saveSessionToDB({
        email,
        name:               projectName,
        optimization_level: result.optimization_level,
        original_code:      result.original_code,
        optimized_code:     result.optimized_code,
        original_analysis:  result.original_analysis,
        optimized_analysis: result.optimized_analysis,
        l1_changes:         result.l1_changes,
        l2:                 result.l2,
        error_report:       result.error_report,
      });
      setSavedSessionId(id);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (e: any) {
      setApiError(e.message || 'Could not save session.');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Derived booleans ────────────────────────────────────────────────────────
  const hasSecurityIssues = (result?.error_report?.security?.length ?? 0) > 0;
  const hasRuntimeRisks   = (result?.error_report?.runtime_risks?.length ?? 0) > 0;
  const realL1Changes     = result ? hasRealL1Changes(result.l1_changes) : false;
  const alreadyOptimal    = !!(result?.l1_changes?.length && !realL1Changes);
  const realL2            = result ? hasRealL2(result.l2) : false;
  const hasFindings       = (result?.error_report?.optimization?.findings?.length ?? 0) > 0;
  const hasAnyExplanation = realL1Changes || realL2 || hasFindings || alreadyOptimal;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          {isRenaming ? (
            <div className="flex items-center gap-2 max-w-md">
              <input
                autoFocus
                className="text-3xl font-bold text-white bg-[#1a1a1a] border-b-2 border-blue-500 focus:outline-none flex-1 px-2 py-1 rounded-t-lg"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={handleRenameBlur}
                onKeyDown={handleRenameKeyDown}
              />
            </div>
          ) : (
            <h1
              onClick={() => { renameCancelledRef.current = false; setTempName(projectName); setIsRenaming(true); }}
              className="text-3xl font-bold text-white flex items-center gap-3 cursor-pointer group hover:text-blue-400 transition-all"
            >
              {projectName}
              <Edit2 className="w-5 h-5 text-gray-700 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all" />
            </h1>
          )}
          <p className="text-gray-500 mt-2 text-sm">Click title to rename · Select level · Run analysis</p>
        </div>

        {/* Level selector */}
        <div className="flex items-center gap-2 p-1 bg-gray-900 border border-gray-800 rounded-2xl">
          {([
            { level: 'level1' as const, label: 'Rule-Based',  icon: Cpu,          color: 'green' },
            { level: 'level2' as const, label: 'AI Refactor', icon: BrainCircuit,  color: 'blue'  },
          ]).map(({ level, label, icon: Icon, color }) => (
            <button
              key={level}
              onClick={() => setSelectedLevel(level)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-sm ${
                selectedLevel === level
                  ? color === 'green'
                    ? 'bg-green-600 text-white shadow-lg shadow-green-600/20'
                    : 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>
      </div>

      {/* Error banner */}
      {apiError && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-red-400 font-bold text-sm">Error</p>
            <p className="text-red-300 text-sm mt-1">{apiError}</p>
          </div>
        </div>
      )}

      {/* Security / runtime warnings */}
      {result && (hasSecurityIssues || hasRuntimeRisks) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {hasSecurityIssues && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
              <p className="text-yellow-400 font-bold text-sm flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" /> Security Warnings
              </p>
              {result.error_report.security!.map((s, i) => (
                <p key={i} className="text-yellow-300 text-xs mt-1">• {s}</p>
              ))}
            </div>
          )}
          {hasRuntimeRisks && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4">
              <p className="text-orange-400 font-bold text-sm flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" /> Runtime Risks
              </p>
              {result.error_report.runtime_risks!.map((r, i) => (
                <p key={i} className="text-orange-300 text-xs mt-1">• {r}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Editors */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Input panel */}
        <div className="flex flex-col gap-0">
          <div className="flex items-center justify-between bg-[#111] px-4 py-3 rounded-t-2xl border-x border-t border-gray-800">
            <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
              <Terminal className="w-4 h-4" /> Input
            </span>
            <button onClick={() => setUserCode('')} className="text-xs text-red-400 hover:underline">
              Clear
            </button>
          </div>
          <CodeEditor value={userCode} onChange={(val) => setUserCode(val || '')} />
          <button
            onClick={handleRun}
            disabled={isProcessing || !userCode.trim()}
            className={`mt-4 w-full py-4 rounded-2xl font-bold shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 text-white ${
              selectedLevel === 'level2' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            {isProcessing
              ? 'Processing…'
              : selectedLevel === 'level2'
              ? 'Execute AI Refactor'
              : 'Run Rule Optimizer'}
          </button>
        </div>

        {/* Output panel */}
        <div className="flex flex-col gap-0">
          <div className="flex items-center justify-between bg-[#111] px-4 py-3 rounded-t-2xl border-x border-t border-gray-800">
            <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" /> Output
            </span>
            <div className="flex items-center gap-3">
              {result?.passed_error_check && (
                <span className="flex items-center gap-1 text-xs text-green-400 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" /> Checks Passed
                </span>
              )}
              {result && (
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
                    saveStatus === 'saved' || savedSessionId
                      ? 'text-green-400 bg-green-400/10 border border-green-400/20'
                      : saveStatus === 'error'
                      ? 'text-red-400 bg-red-400/10 border border-red-400/20'
                      : 'text-blue-400 hover:bg-blue-400/10 border border-transparent hover:border-blue-400/20'
                  }`}
                >
                  {isSaving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : saveStatus === 'saved' || savedSessionId ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <Bookmark className="w-3.5 h-3.5" />
                  )}
                  {isSaving ? 'Saving…' : savedSessionId ? 'Saved' : saveStatus === 'error' ? 'Save Failed' : 'Save to Profile'}
                </button>
              )}
            </div>
          </div>
          <CodeEditor value={result?.optimized_code || ''} readOnly />

          {/* Model rankings (L2) */}
          {(result?.l2?.ranked_models?.length ?? 0) > 0 && (
            <div className="mt-4 bg-[#111] border border-gray-800 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-bold text-gray-500 uppercase mb-3">Model Rankings</p>
              {result!.l2.ranked_models.map((m, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className={`font-medium truncate ${i === 0 ? 'text-white' : 'text-gray-400'}`}>
                    {i === 0 && '🏆 '}{m.model}
                  </span>
                  <div className="flex items-center gap-3 text-xs text-gray-500 shrink-0 ml-3">
                    <span className={m.syntax_ok ? 'text-green-400' : 'text-red-400'}>
                      {m.syntax_ok ? '✓' : '✗'}
                    </span>
                    <span>{m.score.toFixed(3)}</span>
                    <span>{m.latency_ms}ms</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Explanation section (shown after any run) ── */}
      {result && (
        <div className="pt-8 border-t border-gray-800 space-y-4">

          {/* Section header */}
          <div className="border-b border-gray-800 pb-0">
            <div className="inline-flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 border-blue-500 text-blue-400">
              <ListChecks className="w-4 h-4" /> Explanation
            </div>
          </div>

          <div className="space-y-4 pt-2">

            {/* "Code already optimal" banner */}
            {alreadyOptimal && (
              <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-emerald-400 font-bold text-sm">Code Already Optimal</p>
                  <p className="text-emerald-300 text-xs mt-0.5">
                    No rule-based optimizations were applicable — your code passed all checks.
                  </p>
                </div>
              </div>
            )}

            {/* L1 rule-based changes */}
            {realL1Changes && (
              <div className="bg-[#111] border border-gray-800 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Cpu className="w-4 h-4" /> Rule-Based Changes Applied
                </h3>
                <div className="space-y-3">
                  {result.l1_changes.map((change, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 bg-[#0a0a0a] border border-gray-800 rounded-xl">
                      <div className="mt-0.5 p-1.5 rounded-lg bg-green-500/10 text-green-400 shrink-0">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                      <p className="text-gray-300 text-sm">{change}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* L2 AI changes */}
            {realL2 && (result.l2.changes_applied?.length ?? 0) > 0 && (
              <div className="bg-[#111] border border-gray-800 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4" /> AI Changes Applied
                  <span className="ml-auto text-xs font-normal text-gray-600 normal-case">
                    via {result.l2.winning_model}
                  </span>
                </h3>
                <div className="space-y-3">
                  {result.l2.changes_applied.map((change, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 bg-[#0a0a0a] border border-gray-800 rounded-xl">
                      <div className="mt-0.5 p-1.5 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <p className="text-gray-300 text-sm">{change}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* L2 additional suggestions */}
            {realL2 && (result.l2.additional_suggestions?.length ?? 0) > 0 && (
              <div className="bg-[#111] border border-gray-800 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Info className="w-4 h-4" /> Additional Suggestions
                </h3>
                <div className="space-y-2">
                  {result.l2.additional_suggestions.map((s, i) => (
                    <p key={i} className="text-gray-400 text-sm pl-4 border-l-2 border-gray-700">{s}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Optimization opportunities from error checker */}
            {hasFindings && (
              <div className="bg-[#111] border border-yellow-500/20 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Optimization Opportunities
                </h3>
                <div className="space-y-3">
                  {result.error_report.optimization!.findings.map((f, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 bg-[#0a0a0a] border border-yellow-500/10 rounded-xl">
                      <span className="text-xs font-mono text-yellow-600 mt-0.5 shrink-0">L{f.line}</span>
                      <p className="text-gray-300 text-sm">{f.suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* True empty state */}
            {!hasAnyExplanation && (
              <div className="text-center py-16">
                <ListChecks className="w-10 h-10 mx-auto mb-4 text-gray-700" />
                <p className="font-bold text-gray-500">No explanation available</p>
                <p className="text-sm mt-1 text-gray-600">Run an optimization to see what changed.</p>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default OptimizePage;