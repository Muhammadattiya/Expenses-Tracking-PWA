import React from 'react';
import { Play, Trash2, Clock } from 'lucide-react';
import { deleteSimulationHistory } from '../../api/sandbox';

export default function HistoryPanel({ history, onRun, onDelete }) {
  
  const handleDelete = async (id) => {
    try {
      await deleteSimulationHistory(id);
      onDelete();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] rounded-[2.5rem] p-6 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <Clock className="w-5 h-5 text-[#8D6346]" />
        <h2 className="text-xl font-bold text-white/90">History</h2>
      </div>

      {(!history || history.length === 0) ? (
        <div className="flex-1 flex items-center justify-center text-white/50 text-sm">
          No saved simulations yet.
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto pr-2">
          {history.map(item => (
            <div key={item._id} className="bg-black/10 shadow-inner border border-white/5 p-4 rounded-2xl group hover:border-white/10 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-bold text-white">{item.title}</h4>
                  <p className="text-xs text-white/50 uppercase tracking-wider">
                    {item.actions ? `Pipeline (${item.actions.length} actions)` : item.type}
                  </p>
                </div>
                <button 
                  onClick={() => handleDelete(item._id)}
                  title="Delete Simulation"
                  className="p-2 text-brand-red bg-brand-red/10 hover:bg-brand-red/20 rounded-xl transition-all shadow-sm"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-white/50 mb-4 opacity-70">
                {new Date(item.createdAt).toLocaleDateString()}
              </p>
              
              <button 
                onClick={() => onRun(item.actions || [{ type: item.type, payload: item.payload }])}
                className="w-full py-3 rounded-full font-bold text-[13px] text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all duration-300 active:scale-[0.98] bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 hover:border-[#8D6346]/70 flex items-center justify-center gap-2 backdrop-blur-md"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Run Again
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
