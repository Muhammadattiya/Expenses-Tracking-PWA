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
    <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 backdrop-blur-xl h-full flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <Clock className="w-5 h-5 text-brand-blue" />
        <h2 className="text-xl font-bold text-[var(--color-text-main)]">History</h2>
      </div>

      {(!history || history.length === 0) ? (
        <div className="flex-1 flex items-center justify-center text-[var(--color-text-muted)] text-sm">
          No saved simulations yet.
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto pr-2">
          {history.map(item => (
            <div key={item._id} className="bg-black/40 border border-white/5 p-4 rounded-2xl group hover:border-white/10 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-bold text-white">{item.title}</h4>
                  <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">
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
              <p className="text-xs text-[var(--color-text-muted)] mb-4 opacity-70">
                {new Date(item.createdAt).toLocaleDateString()}
              </p>
              
              <button 
                onClick={() => onRun(item.actions || [{ type: item.type, payload: item.payload }])}
                className="w-full py-2.5 bg-white/5 hover:bg-brand-blue border border-white/10 hover:border-brand-blue rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all shadow-lg hover:shadow-brand-blue/20"
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
