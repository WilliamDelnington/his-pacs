import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Icon from '../components/ui/Icon';
import JsonView from '../components/ui/JsonView';
import Collapsible from '../components/ui/Collapsible';

const LUA_SCRIPT = `function OnStoredInstance(instanceId, tags, metadata, origin)
  local patientID = tags['PatientID'] or ''
  local accNum    = tags['AccessionNumber'] or ''
  local studyUID  = tags['StudyInstanceUID'] or ''
  local payload = '{"instanceId":"' .. instanceId
    .. '","patientID":"'       .. patientID
    .. '","accessionNumber":"' .. accNum
    .. '","studyUID":"'        .. studyUID .. '"}'
  HttpPost(
    'http://localhost:3001/api/dicom-callback',
    payload,
    { ['Content-Type'] = 'application/json' }
  )
end`;

const STAT_ROWS = [
  { label: 'Series',    key: 'CountSeries'    },
  { label: 'Instances', key: 'CountInstances' },
  { label: 'Disk Size', key: 'DiskSize'       },
];

export default function CallbackTab({ cb, meta, stats }) {
  return (
    <div className="space-y-4">
      <Card
        title="Step 4 — Lua OnStoredInstance Callback"
        sub="Orthanc fires HTTP POST to HIS after storing the instance"
        badge={<Badge v="orthanc"><Icon n="zap" size={10} />Orthanc→HIS</Badge>}
        icon={<Icon n="zap" size={16} />}
      >
        {!cb ? (
          <div className="text-center py-8 text-gray-400">
            <Icon n="clock" size={36} cls="mx-auto mb-2 opacity-20" />
            <p className="text-sm">Waiting for Lua callback…</p>
            <p className="text-xs mt-1 text-gray-300">Fires automatically 1.5 s after upload</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <Icon n="zap" size={16} cls="text-amber-600 flex-shrink-0" />
              <span className="text-sm font-semibold text-amber-800">
                Callback received! Order updated → <Badge v="received">RECEIVED</Badge>
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">
                Payload from Orthanc Lua script (POST /api/dicom-callback)
              </p>
              <JsonView data={cb} />
            </div>
            <Collapsible label="View Lua Script">
              <div className="json-view text-emerald-300 mt-1">
                <pre>{LUA_SCRIPT}</pre>
              </div>
            </Collapsible>
          </div>
        )}
      </Card>

      <Card
        title="Step 5 — Study Metadata from Orthanc"
        sub="GET /studies/{id} + GET /studies/{id}/statistics"
        badge={<Badge v="his"><Icon n="server" size={10} />HIS</Badge>}
        icon={<Icon n="info" size={16} />}
      >
        {!meta ? (
          <div className="text-center py-8 text-gray-400">
            <Icon n="database" size={36} cls="mx-auto mb-2 opacity-20" />
            <p className="text-sm">Metadata fetched automatically after callback</p>
          </div>
        ) : (
          <div className="space-y-3">
            {stats && (
              <div className="grid grid-cols-3 gap-2">
                {STAT_ROWS.map(s => (
                  <div key={s.label} className="bg-indigo-50 border border-indigo-100 rounded-lg p-2.5 text-center">
                    <p className="text-2xl font-bold text-indigo-700">{stats[s.key]}</p>
                    <p className="text-xs text-indigo-500">{s.label}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {meta.MainDicomTags && Object.entries(meta.MainDicomTags).map(([k, val]) => (
                <div key={k}>
                  <p className="text-xs text-gray-400">{k}</p>
                  <p className="text-xs font-mono text-gray-800 truncate" title={val}>{val}</p>
                </div>
              ))}
            </div>
            <Collapsible label="Full GET /studies/{id} response">
              <JsonView data={meta} />
            </Collapsible>
          </div>
        )}
      </Card>
    </div>
  );
}
