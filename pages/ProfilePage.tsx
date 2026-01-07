
import React, { useState, useEffect } from 'react';
import { mockAuth, mockDb, UserProfileData } from '../mockStorage';
import { OptimizationResult } from '../types';
import { User, Mail, Calendar, Edit3, Save, Code2, Trash2, ChevronRight, Bookmark } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [savedSnippets, setSavedSnippets] = useState<OptimizationResult[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedBio, setEditedBio] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const data = mockAuth.getProfile();
    if (data) {
      setProfile(data);
      setEditedName(data.name);
      setEditedBio(data.bio);
    }
    setSavedSnippets(mockDb.getSavedSnippets());
  }, []);

  const handleSaveProfile = () => {
    if (profile) {
      const updated = { ...profile, name: editedName, bio: editedBio };
      mockAuth.updateProfile(updated);
      setProfile(updated);
      setIsEditing(false);
    }
  };

  const handleDeleteSnippet = (id: string) => {
    mockDb.deleteSnippet(id);
    setSavedSnippets(mockDb.getSavedSnippets());
  };

  if (!profile) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-80 space-y-6">
          <div className="bg-[#111] border border-gray-800 rounded-3xl p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
              <User className="w-32 h-32 text-blue-500" />
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 border-4 border-white/5 flex items-center justify-center text-3xl font-bold mb-4 shadow-xl">
                {profile.name[0].toUpperCase()}
              </div>
              
              {isEditing ? (
                <div className="w-full space-y-3">
                  <input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-gray-800 rounded-xl px-3 py-2 text-white text-center"
                  />
                  <textarea
                    value={editedBio}
                    onChange={(e) => setEditedBio(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-gray-800 rounded-xl px-3 py-2 text-white text-sm text-center h-24 resize-none"
                  />
                  <button
                    onClick={handleSaveProfile}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 rounded-xl transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-white mb-1">{profile.name}</h2>
                  <p className="text-gray-400 text-sm leading-relaxed mb-6">{profile.bio}</p>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-bold transition-all flex items-center gap-2"
                  >
                    <Edit3 className="w-3 h-3" /> Edit Profile
                  </button>
                </>
              )}
            </div>

            <div className="mt-8 pt-8 border-t border-gray-800 space-y-4">
              <div className="flex items-center gap-3 text-sm text-gray-400"><Mail className="w-4 h-4 text-blue-500" /><span>{profile.email}</span></div>
              <div className="flex items-center gap-3 text-sm text-gray-400"><Calendar className="w-4 h-4 text-blue-500" /><span>Joined {profile.joinDate}</span></div>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white flex items-center gap-3"><Bookmark className="w-6 h-6 text-blue-500" />Library Gems</h3>
          </div>

          <div className="grid gap-4">
            {savedSnippets.length === 0 ? (
              <div className="p-12 text-center bg-[#111] border border-dashed border-gray-800 rounded-3xl">
                <Bookmark className="w-8 h-8 text-gray-700 mx-auto mb-4" />
                <h4 className="text-gray-300 font-bold mb-1">Your library is empty</h4>
                <p className="text-gray-500 text-sm">Save your best optimizations to keep them here.</p>
              </div>
            ) : (
              savedSnippets.map((item) => (
                <div key={item.id} onClick={() => navigate(`/optimize?id=${item.id}`)} className="group bg-[#111] border border-gray-800 p-6 rounded-3xl hover:border-blue-500/30 cursor-pointer transition-all flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-2xl ${item.level === 'LEVEL_1' ? 'bg-green-500/10 text-green-400' : 'bg-purple-500/10 text-purple-400'}`}><Code2 className="w-6 h-6" /></div>
                    <div>
                      <h4 className="font-bold text-white group-hover:text-blue-400 transition-colors">{item.name || `Session-${item.id}`}</h4>
                      <p className="text-gray-500 text-xs mt-1">{item.level} • {new Date(item.timestamp).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteSnippet(item.id!); }} className="p-2 text-gray-600 hover:text-red-400"><Trash2 className="w-5 h-5" /></button>
                    <ChevronRight className="w-5 h-5 text-gray-700 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
