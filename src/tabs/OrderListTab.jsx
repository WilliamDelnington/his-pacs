import Badge from '../components/ui/Badge';

const STATUS_VARIANT = { PENDING: 'pending', RECEIVED: 'received', COMPLETED: 'completed' };

const ACTION_LABEL = { PENDING: 'Upload', RECEIVED: 'Metadata', COMPLETED: 'View' };

export default function OrderListTab({ orders, onSelect }) {
  if (!orders.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400 text-sm">
        No orders yet. Create one in the Order tab.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 text-sm">Order List</h2>
        <span className="text-xs text-gray-400">{orders.length} order{orders.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="overflow-y-auto max-h-[480px]">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
            <tr>
              {['Order ID', 'Patient', 'Study', 'Study Type', 'Status', 'Action'].map(col => (
                <th key={col} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {orders.map(o => (
              <tr key={o.orderID} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-700 whitespace-nowrap">{o.orderID}</td>
                <td className="px-4 py-3">
                  <div className="text-xs font-medium text-gray-800">{o.patientName}</div>
                  <div className="text-xs text-gray-400">{o.patientID}</div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600 max-w-[200px] truncate" title={o.studyDescription}>
                  {o.studyDescription}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                    {o.modality}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Badge v={STATUS_VARIANT[o.status] || 'default'}>{o.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onSelect(o)}
                    className="px-3 py-1 text-xs font-medium rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 active:bg-indigo-100 transition-colors whitespace-nowrap"
                  >
                    {ACTION_LABEL[o.status] ?? 'Open'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
