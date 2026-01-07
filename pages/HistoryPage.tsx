
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockDb } from '../mockStorage';
import { OptimizationResult } from '../types';
import { Search, Trash2, Code2 } from 'lucide-react';

const HistoryPage: React.FC = () => {
  const [history, setHistory] = useState<OptimizationResult[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const fetchHistory = () => {
    setHistory(mockDb.getHistory());
  };

  useEffect(() => fetchHistory(), []);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    mockDb.deleteSnippet(id);
    fetchHistory();
  };

  const filtered = history.filter(item => 
    (item.name || item.id || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.explanation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Project Library</h1>
          <p className="text-gray-400 mt-2">All your previous optimization runs.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-3.5 text-gray-500 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search projects..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full bg-[#111111] border border-gray-800 rounded-xl py-3 pl-11 pr-4 text-white focus:ring-2 focus:ring-blue-600/50" 
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-[#111111] border border-gray-800 rounded-2xl text-gray-500">No projects found. Try running an optimization first!</div>
        ) : (
          filtered.map((item) => (
            <div key={item.id} onClick={() => navigate(`/optimize?id=${item.id}`)} className="group bg-[#111111] border border-gray-800 p-6 rounded-2xl hover:border-blue-600/50 cursor-pointer transition-all relative">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4 flex-1">
                  <div className={`p-4 rounded-2xl ${item.level === 'LEVEL_1' ? 'bg-green-500/10 text-green-400' : 'bg-purple-500/10 text-purple-400'}`}><Code2 className="w-6 h-6" /></div>
                  <div>
                    <h3 className="font-bold text-white text-lg group-hover:text-blue-400 transition-colors">{item.name || `Session-${item.id}`}</h3>
                    <div className="flex items-center gap-3 mt-1">
                     
                      
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-8 border-l border-gray-800 pl-8">
                  
                  <button onClick={(e) => handleDelete(e, item.id!)} className="p-3 text-gray-600 hover:text-red-400 transition-colors"><Trash2 className="w-5 h-5" /></button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
