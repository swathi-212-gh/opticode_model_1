import React, { useState, useEffect } from 'react';
import {
  User, Mail, Edit3, Trash2, ChevronRight,
  Bookmark, BarChart2, Zap, BrainCircuit, AlertCircle,
  RefreshCw, CheckCircle2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SavedSession {
  id: string;
  name: string;
  optimization_level: string;
  saved_at: string;
  original_code: string;
  optimized_code: string;
  original_analysis?: {
    total_cyclomatic_complexity: number;
    maintainability_index: number;
    mi_label: string;
    big_o_distribution: Record<string, number>;
  };
}

interface UserProfile {
  name: string;
  email: string;
  bio: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = 'http://localhost:5000';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStoredUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem('opticode_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getLevelIcon(level: string) {
  if (level === 'level2') return BrainCircuit;
  if (level === 'level1') return Zap;
  return BarChart2;
}

function getLevelColor(level: string) {
  if (level === 'level2') return 'bg-blue-500/10 text-blue-400';
  if (level === 'level1') return 'bg-green-500/10 text-green-400';
  return 'bg-gray-500/10 text-gray-400';
}

function getLevelLabel(level: string) {
  if (level === 'level2') return 'AI Refactor';
  if (level === 'level1') return 'Rule-Based';
  return 'Analyse Only';
}

function miColor(label: string) {
  if (label === 'High')     return 'text-green-400';
  if (label === 'Moderate') return 'text-yellow-400';
  return 'text-red-400';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatPill: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="text-center">
    <p className="text-xl font-bold text-white">{value}</p>
    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const ProfilePage: React.FC = () => {
  const [profile, setProfile]                   = useState<UserProfile | null>(null);
  const [editedName, setEditedName]             = useState('');
  const [editedBio, setEditedBio]               = useState('');
  const [isEditing, setIsEditing]               = useState(false);
  const [isSavingProfile, setIsSavingProfile]   = useState(false);
  const [profileSaved, setProfileSaved]         = useState(false);

  const [sessions, setSessions]                 = useState<SavedSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [sessionsError, setSessionsError]       = useState<string | null>(null);

  const navigate = useNavigate();

  // ── Load profile from localStorage ──────────────────────────────────────────
  useEffect(() => {
    const stored = getStoredUser();
    if (stored) {
      setProfile(stored);
      setEditedName(stored.name);
      setEditedBio(stored.bio || '');
    }
  }, []);

  // ── Load sessions from MongoDB ───────────────────────────────────────────────
  useEffect(() => {
    const stored = getStoredUser();
    if (!stored?.email) return;

    setIsLoadingSessions(true);
    setSessionsError(null);

    fetch(`${API_BASE}/api/sessions/${encodeURIComponent(stored.email)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Server error ${r.status}`);
        return r.json();
      })
      .then((data: SavedSession[]) => setSessions(data))
      .catch((e) => setSessionsError(e.message || 'Could not load sessions.'))
      .finally(() => setIsLoadingSessions(false));
  }, []);

  // ── Save profile to MongoDB ──────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!profile) return;
    setIsSavingProfile(true);
    const updated: UserProfile = {
      ...profile,
      name: editedName.trim() || profile.name,
      bio: editedBio,
    };
    try {
      await fetch(`${API_BASE}/api/update-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      setProfile(updated);
      localStorage.setItem('opticode_user', JSON.stringify(updated));
      setIsEditing(false);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch {
      // update locally even if server call fails
      setProfile(updated);
      localStorage.setItem('opticode_user', JSON.stringify(updated));
      setIsEditing(false);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // ── Delete session ───────────────────────────────────────────────────────────
  const handleDeleteSession = async (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id)); // optimistic
    try {
      await fetch(`${API_BASE}/api/sessions/delete/${id}`, { method: 'DELETE' });
    } catch {
      /* silently ignore */
    }
  };

  // ── Open session in optimizer ────────────────────────────────────────────────
  const handleOpenSession = (session: SavedSession) => {
    navigate(`/optimize?session=${session.id}`);
  };

  // ── Guard ────────────────────────────────────────────────────────────────────
  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-bold">Not logged in</p>
          <button
            onClick={() => navigate('/login')}
            className="mt-3 text-sm text-blue-400 hover:underline"
          >
            Go to login
          </button>
        </div>
      </div>
    );
  }

  // ── Stats ────────────────────────────────────────────────────────────────────
  const totalSessions = sessions.length;
  const l2Sessions    = sessions.filter((s) => s.optimization_level === 'level2').length;
  const avgMI =
    sessions.length > 0
      ? Math.round(
          sessions.reduce(
            (sum, s) => sum + (s.original_analysis?.maintainability_index ?? 0),
            0
          ) / sessions.length
        )
      : 0;

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row gap-8">

        {/* ── Profile card ── */}
        <div className="w-full md:w-80 space-y-6 shrink-0">
          <div className="bg-[#111] border border-gray-800 rounded-3xl p-8 relative overflow-hidden group">
            {/* decorative bg icon */}
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
              <User className="w-32 h-32 text-blue-500" />
            </div>

            <div className="flex flex-col items-center text-center">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 border-4 border-white/5 flex items-center justify-center text-3xl font-bold mb-4 shadow-xl">
                {profile.name[0]?.toUpperCase()}
              </div>

              {isEditing ? (
                <div className="w-full space-y-3">
                  <input
                    autoFocus
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder="Display name"
                    className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl px-3 py-2 text-white text-center text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <textarea
                    value={editedBio}
                    onChange={(e) => setEditedBio(e.target.value)}
                    placeholder="Short bio…"
                    className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm text-center h-20 resize-none focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSavingProfile}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      {isSavingProfile
                        ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                        : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditedName(profile.name);
                        setEditedBio(profile.bio || '');
                      }}
                      className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-bold py-2 rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-white mb-1">{profile.name}</h2>
                  {profileSaved && (
                    <span className="text-xs text-green-400 flex items-center gap-1 mb-2">
                      <CheckCircle2 className="w-3 h-3" /> Profile updated
                    </span>
                  )}
                  <p className="text-gray-400 text-sm leading-relaxed mb-6 min-h-[36px]">
                    {profile.bio || <span className="italic text-gray-600">No bio yet</span>}
                  </p>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-bold transition-all flex items-center gap-2"
                  >
                    <Edit3 className="w-3 h-3" /> Edit Profile
                  </button>
                </>
              )}
            </div>

            {/* Email */}
            <div className="mt-8 pt-8 border-t border-gray-800">
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <Mail className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="truncate">{profile.email}</span>
              </div>
            </div>

            {/* Quick stats */}
            <div className="mt-6 pt-6 border-t border-gray-800 grid grid-cols-3 gap-2">
              <StatPill label="Sessions" value={totalSessions} />
              <StatPill label="AI Runs"  value={l2Sessions} />
              <StatPill label="Avg MI"   value={avgMI || '—'} />
            </div>
          </div>
        </div>

        {/* ── Sessions list ── */}
        <div className="flex-1 space-y-6 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <Bookmark className="w-6 h-6 text-blue-500" />
              Saved Sessions
            </h3>
            <span className="text-xs text-gray-600 font-bold uppercase tracking-wider">
              {isLoadingSessions ? 'Loading…' : `${totalSessions} total`}
            </span>
          </div>

          {/* Error state */}
          {sessionsError && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {sessionsError}
            </div>
          )}

          {/* Loading skeleton */}
          {isLoadingSessions && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-[#111] border border-gray-800 rounded-3xl p-5 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gray-800" />
                    <div className="space-y-2">
                      <div className="w-40 h-4 bg-gray-800 rounded" />
                      <div className="w-24 h-3 bg-gray-800 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoadingSessions && !sessionsError && sessions.length === 0 && (
            <div className="p-14 text-center bg-[#111] border border-dashed border-gray-800 rounded-3xl">
              <Bookmark className="w-8 h-8 text-gray-700 mx-auto mb-4" />
              <h4 className="text-gray-300 font-bold mb-1">No sessions saved yet</h4>
              <p className="text-gray-500 text-sm mb-5">
                Run an optimization and hit <strong className="text-gray-400">Save to Profile</strong> — it'll appear here.
              </p>
              <button
                onClick={() => navigate('/optimize')}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all"
              >
                Go to Optimizer
              </button>
            </div>
          )}

          {/* Session cards */}
          {!isLoadingSessions &&
            sessions.map((item) => {
              const Icon       = getLevelIcon(item.optimization_level);
              const colorClass = getLevelColor(item.optimization_level);
              const label      = getLevelLabel(item.optimization_level);
              const date       = new Date(item.saved_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              });
              const mi    = item.original_analysis?.maintainability_index;
              const miLbl = item.original_analysis?.mi_label ?? '';
              const cc    = item.original_analysis?.total_cyclomatic_complexity;
              const bigO  = item.original_analysis?.big_o_distribution
                ? Object.keys(item.original_analysis.big_o_distribution)[0]
                : null;

              return (
                <div
                  key={item.id}
                  onClick={() => handleOpenSession(item)}
                  className="group bg-[#111] border border-gray-800 p-5 rounded-3xl hover:border-blue-500/30 hover:bg-[#141414] cursor-pointer transition-all flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`p-3.5 rounded-2xl shrink-0 ${colorClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                        {item.name || `Session ${item.id}`}
                      </h4>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${colorClass}`}>
                          {label}
                        </span>
                        <span className="text-xs text-gray-600">{date}</span>
                        {mi !== undefined && (
                          <>
                            <span className="text-xs text-gray-700">·</span>
                            <span className={`text-xs font-medium ${miColor(miLbl)}`}>
                              MI {mi}
                            </span>
                          </>
                        )}
                        {cc !== undefined && (
                          <>
                            <span className="text-xs text-gray-700">·</span>
                            <span className="text-xs text-gray-500">CC {cc}</span>
                          </>
                        )}
                        {bigO && (
                          <>
                            <span className="text-xs text-gray-700">·</span>
                            <span className="text-xs font-mono text-gray-500">{bigO}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteSession(item.id); }}
                      className="p-2 text-gray-600 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                      title="Delete session"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-5 h-5 text-gray-700 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;