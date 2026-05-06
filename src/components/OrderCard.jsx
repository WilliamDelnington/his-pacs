import { STEPS } from '../constants/steps';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Icon from './ui/Icon';

const STATUS_VARIANT = { PENDING: 'pending', RECEIVED: 'received', COMPLETED: 'completed' };

export default function OrderCard({ order, done }) {
  if (!order) {
    return (
      <Card title="Active Order" icon={<Icon n="file-text" size={16} />}>
        <p className="text-sm text-gray-400 text-center py-4">No active order</p>
      </Card>
    );
  }

  const rows = [
    { label: 'Order ID',    val: order.orderID,                                    mono: true  },
    { label: 'Patient',     val: order.patientName,                                mono: false },
    { label: 'Patient ID',  val: order.patientID,                                  mono: true  },
    { label: 'Modality',    val: order.modality,                                   mono: false },
    { label: 'Description', val: order.studyDescription,                           mono: false },
    { label: 'Created',     val: new Date(order.createdAt).toLocaleTimeString(),   mono: false },
  ];

  return (
    <Card
      title="Active Order"
      icon={<Icon n="file-text" size={16} />}
      badge={<Badge v={STATUS_VARIANT[order.status] || 'default'}>{order.status}</Badge>}
    >
      <div className="space-y-2 text-sm">
        {rows.map(r => (
          <div key={r.label} className="flex justify-between items-start gap-2">
            <span className="text-gray-400 text-xs flex-shrink-0">{r.label}</span>
            <span className={`text-right text-xs ${r.mono ? 'font-mono' : ''} text-gray-800`}>
              {r.val}
            </span>
          </div>
        ))}
        {order.studyUID && (
          <div>
            <p className="text-xs text-gray-400">Study UID</p>
            <p className="font-mono text-xs text-gray-800 break-all leading-tight">{order.studyUID}</p>
          </div>
        )}
      </div>
      <div className="mt-4 space-y-1 pt-3 border-t border-gray-100">
        {[1, 2, 3, 4, 5, 6, 7].map(n => (
          <div
            key={n}
            className={`flex items-center gap-2 text-xs ${done.includes(n) ? 'text-green-700' : 'text-gray-400'}`}
          >
            <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
              done.includes(n) ? 'bg-green-500' : 'bg-gray-200'
            }`}>
              {done.includes(n) && <Icon n="check" size={9} cls="text-white" />}
            </div>
            Step {n} — {STEPS.find(s => s.n === n)?.label}
          </div>
        ))}
      </div>
    </Card>
  );
}
