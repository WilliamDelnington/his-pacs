import Dot from './ui/Dot';
import Badge from './ui/Badge';
import Icon from './ui/Icon';

export default function StatusBar({ his, orthanc, orthSys, onSettings }) {
  return (
    <div className="bg-gray-950 text-white px-4 py-2 flex items-center justify-between text-xs">
      <div className="flex items-center gap-5">
        <span className="font-bold text-indigo-400 text-sm">HIS ↔ Orthanc</span>
        <div className="flex items-center gap-1.5">
          <Dot s={his} />
          <span className="text-gray-400">HIS</span>
          {his === 'online'  && <Badge v="his">Online</Badge>}
          {his === 'offline' && <Badge v="error">Offline</Badge>}
        </div>
        <div className="flex items-center gap-1.5">
          <Dot s={orthanc} />
          <span className="text-gray-400">Orthanc</span>
          {orthSys && (
            <span className="text-gray-500">v{orthSys.Version} · AET: {orthSys.DicomAet}</span>
          )}
          {orthanc === 'online'   && <Badge v="orthanc">Online</Badge>}
          {orthanc === 'offline'  && <Badge v="error">Offline</Badge>}
          {orthanc === 'checking' && <span className="text-gray-500 animate-pulse">checking...</span>}
        </div>
      </div>
      <button
        onClick={onSettings}
        className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
      >
        <Icon n="settings" size={13} />Settings
      </button>
    </div>
  );
}
