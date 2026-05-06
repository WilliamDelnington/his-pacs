import Card from './ui/Card';
import Badge from './ui/Badge';
import Icon from './ui/Icon';
import Collapsible from './ui/Collapsible';

const LUA_SCRIPT = `-- orthanc.lua
function OnStoredInstance(
    instanceId, tags, metadata, origin)
  local body = string.format(
    '{"instanceId":"%s","patientID":"%s",' ..
    '"accessionNumber":"%s","studyUID":"%s"}',
    instanceId,
    tags['PatientID'] or '',
    tags['AccessionNumber'] or '',
    tags['StudyInstanceUID'] or '')
  HttpPost(
    'http://localhost:3001/api/dicom-callback',
    body,
    {['Content-Type'] = 'application/json'})
end`;

const ENDPOINTS = [
  'POST /instances',
  'GET  /studies/{id}',
  'GET  /studies/{id}/statistics',
  'GET  /instances/{id}/preview',
  'POST /tools/find',
];

export default function LuaCard() {
  return (
    <Card
      title="Lua Script Reference"
      icon={<Icon n="zap" size={16} />}
      badge={<Badge v="orthanc">Orthanc</Badge>}
    >
      <p className="text-xs text-gray-500 mb-2">
        Add to <code>orthanc.lua</code> to close the loop:
      </p>
      <Collapsible label="Show script" initOpen={false}>
        <div className="json-view text-emerald-300 mt-1 text-xs">
          <pre>{LUA_SCRIPT}</pre>
        </div>
      </Collapsible>
      <div className="mt-3 space-y-1 text-xs text-gray-500">
        <p className="font-semibold text-gray-700">Key Orthanc API endpoints</p>
        {ENDPOINTS.map(e => (
          <p key={e} className="font-mono text-gray-500">{e}</p>
        ))}
      </div>
    </Card>
  );
}
