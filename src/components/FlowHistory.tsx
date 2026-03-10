import React from 'react';
import { Flow } from '../types';
import { Activity, CheckCircle2, Clock } from 'lucide-react';

interface FlowHistoryProps {
  flows: Flow[];
}

export const FlowHistory: React.FC<FlowHistoryProps> = ({ flows }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
        <Activity size={18} className="text-indigo-600" />
        <h3 className="font-semibold text-slate-800 text-sm">Flow Lifecycle History</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        {flows.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
            <Clock size={32} className="mb-2 opacity-20" />
            <p className="text-xs">No active flows deployed yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {flows.map((flow) => (
              <div key={flow.id} className="p-3 rounded-xl border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-700">{flow.name}</span>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase">
                    <CheckCircle2 size={10} />
                    Active
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 line-clamp-1 mb-2">{flow.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono text-slate-400">ID: {flow.id}</span>
                  <button className="text-[10px] font-bold text-indigo-600 hover:underline">View Code</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
