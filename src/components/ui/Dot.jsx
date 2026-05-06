const STATUS_CX = {
  online:   'bg-green-400',
  offline:  'bg-red-400',
  checking: 'bg-amber-400 animate-pulse',
};

export default function Dot({ s }) {
  const cx = STATUS_CX[s] || 'bg-gray-400';
  return <span className={`w-2 h-2 rounded-full ${cx}`} />;
}
