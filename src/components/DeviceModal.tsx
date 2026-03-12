import React, { useState } from 'react';
import { Device } from '../types';
import { X } from 'lucide-react';

interface DeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (device: Device) => void;
  initialDevice?: Partial<Device>;
}

export const DeviceModal: React.FC<DeviceModalProps> = ({ isOpen, onClose, onSave, initialDevice }) => {
  const [formData, setFormData] = useState<Partial<Device>>(initialDevice || {
    name: '',
    type: 'host',
    status: 'online',
    x: 400,
    y: 300
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="font-bold text-slate-800 text-lg">
            {initialDevice?.id ? 'Edit Device' : 'Add New Device'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Device Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="e.g. Core Switch 01"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="controller">Controller</option>
                <option value="router">Router</option>
                <option value="switch">Switch</option>
                <option value="host">Host</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="programming">Programming</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">X Position</label>
              <input
                type="number"
                value={formData.x}
                onChange={(e) => setFormData({ ...formData, x: parseInt(e.target.value) })}
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Y Position</label>
              <input
                type="number"
                value={formData.y}
                onChange={(e) => setFormData({ ...formData, y: parseInt(e.target.value) })}
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({
              id: formData.id || Math.random().toString(36).substr(2, 9),
              name: formData.name || 'Unnamed Device',
              type: formData.type || 'host',
              status: formData.status || 'online',
              x: formData.x || 400,
              y: formData.y || 300,
              config: formData.config
            })}
            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
          >
            Save Device
          </button>
        </div>
      </div>
    </div>
  );
};
