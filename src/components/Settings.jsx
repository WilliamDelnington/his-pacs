import { useState } from 'react';
import Icon from './ui/Icon';

const FIELDS = [
  { label: 'Orthanc Base URL',       key: 'orthancUrl', ph: 'http://localhost:8042',                    type: 'text'     },
  { label: 'Orthanc Username',        key: 'username',   ph: 'admin',                                   type: 'text'     },
  { label: 'Orthanc Password',        key: 'password',   ph: 'password',                                type: 'password' },
  { label: 'DICOM Viewer URL (base)', key: 'viewerUrl',  ph: 'http://localhost:8042/app/explorer.html', type: 'text'     },
];

export default function Settings({ show, onClose, cfg, onSave }) {
  const [v, setV] = useState({ ...cfg });
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="w-[420px] bg-white shadow-2xl flex flex-col slide-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Icon n="settings" size={18} />Settings
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <Icon n="x" size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {FIELDS.map(f => (
            <div key={f.key}>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
              <input
                type={f.type}
                value={v[f.key] || ''}
                placeholder={f.ph}
                onChange={e => setV(p => ({ ...p, [f.key]: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          ))}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 space-y-1.5">
            <p className="font-semibold">Viewer URL formats</p>
            <div className="space-y-1">
              <p className="font-medium">Built-in explorer <span className="text-blue-500">(no plugin needed)</span></p>
              <code className="block bg-white border border-blue-200 rounded p-1.5">…/app/explorer.html</code>
              <p className="font-medium">OHIF Viewer plugin</p>
              <code className="block bg-white border border-blue-200 rounded p-1.5">…/ohif/viewer</code>
              <p className="font-medium">Stone Web Viewer plugin</p>
              <code className="block bg-white border border-blue-200 rounded p-1.5">…/stone-webviewer/index.html</code>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-1">
            <p className="font-semibold">Orthanc Lua Callback endpoint</p>
            <code className="block bg-white border border-amber-200 rounded p-2">
              POST http://localhost:3001/api/dicom-callback
            </code>
            <p>Configure in your Orthanc Lua script`s <code>OnStoredInstance</code>.</p>
          </div>
        </div>

        <div className="flex gap-2 p-5 border-t border-gray-200">
          <button
            onClick={() => { onSave(v); onClose(); }}
            className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            Save Settings
          </button>
          <button
            onClick={onClose}
            className="px-4 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
