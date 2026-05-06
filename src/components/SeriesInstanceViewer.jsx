import { useState, useEffect, useCallback } from 'react';
import orthancClient from '../api/orthancClient';
import Icon from './ui/Icon';

const MAX_INSTANCES = 60;

function Placeholder({ icon, title, sub }) {
  return (
    <div className="rounded-lg bg-gray-950 border border-gray-800 flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
      <Icon n={icon} size={48} cls="text-gray-700" />
      <p className="text-gray-400 text-sm font-medium">{title}</p>
      {sub && <p className="text-gray-600 text-xs max-w-xs">{sub}</p>}
    </div>
  );
}

export default function SeriesInstanceViewer({ seriesId }) {
  const [instances, setInstances] = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [thumbUrls, setThumbUrls] = useState({});
  const [mainImg,   setMainImg]   = useState(null);
  const [mainLoad,  setMainLoad]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);

  const fetchInstances = useCallback(async () => {
    if (!seriesId) return;
    setLoading(true);
    setError(null);
    try {
      const r = await orthancClient.get(`/series/${seriesId}/instances`);
      const list = r.data.slice(0, MAX_INSTANCES).sort((a, b) => {
        const na = a.MainDicomTags?.InstanceNumber ?? 0;
        const nb = b.MainDicomTags?.InstanceNumber ?? 0;
        return Number(na) - Number(nb);
      });
      setInstances(list);
      if (list.length > 0) setSelected(list[0].ID);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, [seriesId]);

  useEffect(() => {
    setInstances([]);
    setSelected(null);
    setThumbUrls({});
    setMainImg(null);
    fetchInstances();
  }, [fetchInstances]);

  // Load thumbnails progressively
  useEffect(() => {
    if (instances.length === 0) return;
    const created = [];
    instances.forEach(inst => {
      orthancClient.get(`/instances/${inst.ID}/preview`, { responseType: 'blob' })
        .then(r => {
          const url = URL.createObjectURL(r.data);
          created.push(url);
          setThumbUrls(p => ({ ...p, [inst.ID]: url }));
        })
        .catch(() => {});
    });
    return () => created.forEach(URL.revokeObjectURL);
  }, [instances]);

  // Load full-size rendered image for selected instance
  useEffect(() => {
    if (!selected) { setMainImg(null); return; }
    let active = true;
    let url = null;
    setMainLoad(true);
    orthancClient.get(`/instances/${selected}/rendered`, { responseType: 'blob' })
      .then(r => {
        if (!active) return;
        url = URL.createObjectURL(r.data);
        setMainImg(url);
        setMainLoad(false);
      })
      .catch(() => { if (active) setMainLoad(false); });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [selected]);

  if (loading) return <Placeholder icon="loader" title="Loading instances…" />;

  if (error) {
    return (
      <div className="rounded-lg bg-red-950 border border-red-800 p-4 text-center">
        <p className="text-red-400 text-sm font-medium mb-1">Failed to load DICOM instances</p>
        <p className="text-red-600 text-xs">{error}</p>
      </div>
    );
  }

  if (instances.length === 0) {
    return (
      <Placeholder
        icon="database"
        title="No instances found"
        sub={`Series ${seriesId?.slice(0, 18)}… returned no DICOM instances.`}
      />
    );
  }

  const selectedIdx = instances.findIndex(i => i.ID === selected);
  const selInst     = instances[selectedIdx];

  return (
    <div className="rounded-lg overflow-hidden border border-gray-700 bg-gray-950 flex flex-col">
      {/* Main image panel */}
      <div className="relative bg-black flex items-center justify-center" style={{ minHeight: 420 }}>
        {mainLoad && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon n="loader" size={36} cls="text-indigo-400" />
          </div>
        )}
        {mainImg && (
          <img
            src={mainImg}
            alt={`Instance ${selectedIdx + 1}`}
            className="max-w-full max-h-[520px] object-contain"
            style={{ opacity: mainLoad ? 0.3 : 1, transition: 'opacity 0.15s' }}
          />
        )}

        {selInst && (
          <div className="absolute top-2 left-2 bg-black/70 rounded px-2 py-1 text-xs text-gray-300 font-mono space-y-0.5">
            {selInst.MainDicomTags?.InstanceNumber && (
              <p>Inst #{selInst.MainDicomTags.InstanceNumber}</p>
            )}
            {selInst.MainDicomTags?.SOPClassUID && (
              <p className="text-gray-500">{selInst.MainDicomTags.SOPClassUID.slice(-12)}</p>
            )}
          </div>
        )}

        {instances.length > 1 && (
          <div className="absolute bottom-2 right-2 flex gap-1">
            <button
              disabled={selectedIdx === 0}
              onClick={() => setSelected(instances[selectedIdx - 1].ID)}
              className="px-2 py-1 bg-black/70 text-gray-300 rounded text-xs hover:bg-black/90 disabled:opacity-30"
            >
              ‹ Prev
            </button>
            <button
              disabled={selectedIdx === instances.length - 1}
              onClick={() => setSelected(instances[selectedIdx + 1].ID)}
              className="px-2 py-1 bg-black/70 text-gray-300 rounded text-xs hover:bg-black/90 disabled:opacity-30"
            >
              Next ›
            </button>
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {instances.length > 1 && (
        <div className="flex gap-1.5 p-2 bg-gray-900 border-t border-gray-800 overflow-x-auto">
          {instances.map((inst, i) => (
            <button
              key={inst.ID}
              onClick={() => setSelected(inst.ID)}
              title={`Instance ${i + 1}${inst.MainDicomTags?.InstanceNumber ? ` (#${inst.MainDicomTags.InstanceNumber})` : ''}`}
              className={`flex-shrink-0 rounded overflow-hidden border-2 transition-all ${
                selected === inst.ID
                  ? 'border-indigo-400 ring-1 ring-indigo-400/50'
                  : 'border-gray-700 hover:border-gray-500'
              }`}
            >
              {thumbUrls[inst.ID] ? (
                <img src={thumbUrls[inst.ID]} alt={`Inst ${i + 1}`} className="w-14 h-14 object-cover" />
              ) : (
                <div className="w-14 h-14 bg-gray-800 flex items-center justify-center text-gray-600 text-xs">
                  {i + 1}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Status bar */}
      <div className="flex items-center gap-3 px-3 py-2 bg-gray-900 border-t border-gray-800 text-xs text-gray-500">
        <Icon n="info" size={12} />
        <span>
          {selectedIdx + 1} / {instances.length} instance{instances.length !== 1 ? 's' : ''}
        </span>
        {instances.length === MAX_INSTANCES && (
          <span className="text-amber-600">· first {MAX_INSTANCES} instances shown</span>
        )}
        <span className="ml-auto font-mono text-gray-600">{selected?.slice(0, 18)}…</span>
      </div>
    </div>
  );
}
