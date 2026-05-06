const VARIANT_CX = {
  his:       'bg-blue-100 text-blue-800 border border-blue-200',
  orthanc:   'bg-emerald-100 text-emerald-800 border border-emerald-200',
  pending:   'bg-amber-100 text-amber-800 border border-amber-200',
  received:  'bg-indigo-100 text-indigo-800 border border-indigo-200',
  completed: 'bg-green-100 text-green-800 border border-green-200',
  error:     'bg-red-100 text-red-700 border border-red-200',
  default:   'bg-gray-100 text-gray-700 border border-gray-200',
};

export default function Badge({ children, v = 'default' }) {
  const cx = VARIANT_CX[v] || VARIANT_CX.default;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cx}`}>
      {children}
    </span>
  );
}
