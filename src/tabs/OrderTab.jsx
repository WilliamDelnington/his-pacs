import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Icon from '../components/ui/Icon';

const MODALITIES = ['CT', 'MR', 'XR', 'US', 'PET', 'NM', 'MG', 'PT', 'DX', 'CR'];

const TEXT_FIELDS = [
  { label: 'Patient Name *',    key: 'patientName',      ph: 'Nguyen Van A', span: false },
  { label: 'Patient ID *',      key: 'patientID',        ph: 'PAT-001',      span: false },
  { label: 'Study Description', key: 'studyDescription', ph: 'Chest CT',     span: true  },
];

export default function OrderTab({ form, setForm, onSubmit, loading, done }) {
  const created = done.includes(1);

  return (
    <Card
      title="Step 1 — Create Imaging Order"
      sub="HIS generates order ID, patient demographics, status: PENDING"
      badge={<Badge v="his"><Icon n="server" size={10} />HIS</Badge>}
      icon={<Icon n="file-text" size={16} />}
    >
      <div className="space-y-4">
        {created && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
            <Icon n="check" size={16} cls="text-green-600 flex-shrink-0" />
            Order created successfully — status <strong>PENDING</strong>. Proceed to Upload.
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {TEXT_FIELDS.map(f => (
            <div key={f.key} className={f.span ? 'col-span-2' : ''}>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{f.label}</label>
              <input
                type="text"
                value={form[f.key]}
                disabled={created}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.ph}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Modality *</label>
            <select
              value={form.modality}
              disabled={created}
              onChange={e => setForm(p => ({ ...p, modality: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
            >
              {MODALITIES.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-500 mb-1.5">HIS Payload Preview</p>
          <div className="json-view" style={{ maxHeight: '110px' }}>
            <pre>{JSON.stringify({
              orderID:          'ORD-XXXX-XXX',
              patientID:        form.patientID,
              patientName:      form.patientName,
              modality:         form.modality,
              studyDescription: form.studyDescription,
              status:           'PENDING',
              createdAt:        new Date().toISOString(),
            }, null, 2)}</pre>
          </div>
        </div>

        {!created ? (
          <button
            onClick={onSubmit}
            disabled={loading || !form.patientName || !form.patientID}
            className="w-full bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 flex items-center justify-center gap-2 transition-colors"
          >
            <Icon n={loading ? 'loader' : 'plus'} size={16} />
            {loading ? 'Creating order…' : 'POST /api/orders — Create Imaging Order'}
          </button>
        ) : (
          <div className="w-full bg-green-50 border border-green-200 text-green-700 rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2">
            <Icon n="check" size={16} />Order created — switch to Upload tab
          </div>
        )}
      </div>
    </Card>
  );
}
