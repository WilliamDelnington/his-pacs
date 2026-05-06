import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Icon from '../components/ui/Icon';

export default function UploadTab({ order, onUpload, loading, result, file, setFile, fileRef, done }) {
  const uploaded = done.includes(2);

  if (!order) {
    return (
      <Card title="Step 2 — Upload DICOM to Orthanc" icon={<Icon n="upload" size={16} />}>
        <div className="text-center py-10 text-gray-400">
          <Icon n="file-text" size={40} cls="mx-auto mb-2 opacity-20" />
          <p className="text-sm">Create an order in Step 1 first</p>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Step 2 — Upload DICOM to Orthanc"
      sub="POST /instances — Content-Type: application/dicom"
      badge={<Badge v="orthanc"><Icon n="database" size={10} />Orthanc</Badge>}
      icon={<Icon n="upload" size={16} />}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-sm">
          <div>
            <p className="text-xs font-semibold text-indigo-500">AccessionNumber (DICOM tag)</p>
            <p className="font-mono font-bold text-indigo-900">{order.orderID}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-indigo-500">PatientID (DICOM tag)</p>
            <p className="font-mono font-bold text-indigo-900">{order.patientID}</p>
          </div>
        </div>

        {uploaded && result && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Icon n="check" size={16} cls="text-green-600" />
              <span className="text-sm font-semibold text-green-800">
                Upload successful — Status: {result.Status}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-1 text-xs font-mono">
              <div><span className="text-gray-500">Instance ID: </span><span className="text-gray-800">{result.ID}</span></div>
              <div><span className="text-gray-500">ParentStudy: </span><span className="text-gray-800">{result.ParentStudy}</span></div>
              <div><span className="text-gray-500">ParentSeries: </span><span className="text-gray-800">{result.ParentSeries}</span></div>
            </div>
          </div>
        )}

        {!uploaded && (
          <>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
            >
              <Icon n="upload" size={32} cls="mx-auto mb-2 text-gray-400" />
              {file ? (
                <div>
                  <p className="text-sm font-semibold text-indigo-700">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-gray-600">Drop a .dcm file or click to browse</p>
                  <p className="text-xs text-gray-400 mt-1">Supports .dcm · application/dicom</p>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".dcm,.dicom,application/dicom"
                className="hidden"
                onChange={e => setFile(e.target.files[0])}
              />
            </div>

            <button
              onClick={() => onUpload()}
              disabled={loading || !file}
              className="w-full bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 flex items-center justify-center gap-2 transition-colors"
            >
              <Icon n={loading ? 'loader' : 'upload'} size={16} />
              {loading ? 'Processing workflow…' : (file ? `Upload ${file.name}` : 'Select a .dcm file above')}
            </button>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-gray-500 space-y-0.5">
              <p className="font-semibold text-gray-700">Orthanc API: POST /instances</p>
              <p>Content-Type: application/dicom</p>
              <p>Required tags: (0010,0020) PatientID, (0008,0050) AccessionNumber</p>
              <p>Returns: ID, ParentStudy, ParentSeries, ParentPatient, Status</p>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
