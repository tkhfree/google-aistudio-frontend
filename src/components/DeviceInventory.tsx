import React from 'react';
import { Device } from '../types';
import { Server, Cpu, Database, Globe, Plus, Trash2 } from 'lucide-react';

interface DeviceInventoryProps {
  devices: Device[];
  onAddClick: () => void;
  onDeleteClick: (id: string) => void;
}

export const DeviceInventory: React.FC<DeviceInventoryProps> = ({ devices, onAddClick, onDeleteClick }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server size={18} className="text-indigo-600" />
          <h3 className="font-semibold text-slate-800 text-sm">Device Inventory</h3>
        </div>
        <button
          onClick={onAddClick}
          className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          title="Add Device"
        >
          <Plus size={16} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-2">
          {devices.map((device) => (
            <div key={device.id} className="p-3 rounded-xl border border-slate-100 flex items-center gap-3 group">
              <div className={`p-2 rounded-lg ${
                device.type === 'controller' ? 'bg-emerald-100 text-emerald-600' :
                device.type === 'router' ? 'bg-blue-100 text-blue-600' :
                'bg-slate-100 text-slate-600'
              }`}>
                {device.type === 'controller' ? <Globe size={16} /> :
                 device.type === 'router' ? <Cpu size={16} /> :
                 <Database size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{device.name}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{device.type}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${device.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <span className="text-[10px] font-medium text-slate-500 capitalize">{device.status}</span>
                </div>
                <button
                  onClick={() => onDeleteClick(device.id)}
                  className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
