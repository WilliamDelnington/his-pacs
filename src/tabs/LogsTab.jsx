import { useRef, useEffect } from 'react';
import Card from '../components/ui/Card';
import Icon from '../components/ui/Icon';

const LOG_CX = {
  error:   'bg-red-50 text-red-700',
  his:     'bg-blue-50 text-blue-800',
  orthanc: 'bg-emerald-50 text-emerald-800',
};

export default function LogsTab({ logs }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs]);

  return (
    <Card title="Activity Log" icon={<Icon n="activity" size={16} />}>
      <div ref={ref} className="space-y-0.5 max-h-[420px] overflow-y-auto font-mono text-xs">
        {logs.length === 0 && (
          <p className="text-gray-400 text-center py-6">No activity yet. Create an order to begin.</p>
        )}
        {logs.map((l, i) => (
          <div
            key={i}
            className={`flex gap-2 py-1 px-2 rounded ${LOG_CX[l.t] || 'bg-gray-50 text-gray-600'}`}
          >
            <span className="text-gray-400 flex-shrink-0 tabular-nums">{l.time}</span>
            <span>{l.msg}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
