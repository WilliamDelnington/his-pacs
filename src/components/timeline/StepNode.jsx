import Icon from '../ui/Icon';

const BASE = 'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold transition-all duration-300';

export default function StepNode({ step, done, active }) {
  if (done)   return <div className={`${BASE} bg-green-500 text-white`}><Icon n="check" size={15} /></div>;
  if (active) return <div className={`${BASE} bg-indigo-500 text-white step-active`}><Icon n="loader" size={14} /></div>;
  return <div className={`${BASE} bg-gray-200 text-gray-500`}>{step}</div>;
}
