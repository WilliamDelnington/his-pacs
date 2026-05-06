import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Icon from '../components/ui/Icon';
import JsonView from '../components/ui/JsonView';
import DicomViewer from '../components/DicomViewer';

export default function ViewerTab({ vUrl, meta, stats, order, done }) {
  const ready = done.includes(7);

  if (!ready) {
    return (
      <Card title="Step 7 — DICOM Image Viewer" icon={<Icon n="monitor" size={16} />}>
        <div className="text-center py-14 text-gray-400">
          <Icon n="monitor" size={56} cls="mx-auto mb-3 opacity-15" />
          <p className="text-sm font-medium">Viewer not ready yet</p>
          <p className="text-xs mt-1 text-gray-300">Complete the upload workflow to generate a viewer URL</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card
        title="Step 7 — DICOM Image Viewer"
        sub={`${stats?.CountInstances ?? '?'} instances · study ready`}
        badge={<Badge v="completed"><Icon n="check" size={10} />Complete</Badge>}
        icon={<Icon n="monitor" size={16} />}
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-green-700 mb-0.5">Viewer URL (Step 6)</p>
              <p className="text-xs font-mono text-green-900 break-all">{vUrl}</p>
            </div>
            <a
              href={vUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors"
            >
              <Icon n="external-link" size={12} />Open
            </a>
          </div>

          <DicomViewer studyId={meta?.ID} />
        </div>
      </Card>

      {meta && order && (
        <Card
          title="HIS Final Response"
          icon={<Icon n="file-text" size={16} />}
          badge={<Badge v="his">HIS</Badge>}
        >
          <JsonView data={{
            orderID:          order.orderID,
            status:           'COMPLETED',
            orthancStudyID:   meta.ID,
            studyInstanceUID: meta.MainDicomTags?.StudyInstanceUID,
            instanceCount:    stats?.CountInstances,
            viewerURL:        vUrl,
          }} />
        </Card>
      )}
    </div>
  );
}
