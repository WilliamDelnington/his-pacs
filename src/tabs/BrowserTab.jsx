import { useState, useEffect, useCallback } from 'react';
import orthancClient from '../api/orthancClient';
import Icon from '../components/ui/Icon';
import SeriesInstanceViewer from '../components/SeriesInstanceViewer';

function fmtName(name = '') {
  return name.replace(/\^/g, ' ').trim() || 'Unknown';
}

function fmtDate(d = '') {
  if (!d || d.length < 8) return d || '—';
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

function EmptyState({ icon, title, sub }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[180px] py-10 px-4 text-center gap-2">
      <Icon n={icon} size={28} cls="text-gray-500" />
      <p className="text-gray-500 text-sm font-medium">{title}</p>
      {sub && <p className="text-gray-600 text-xs leading-snug max-w-[160px]">{sub}</p>}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-10 gap-2">
      <Icon n="loader" size={18} cls="text-indigo-400" />
      <span className="text-gray-500 text-sm">Loading…</span>
    </div>
  );
}

function Panel({ title, badge, loading, error, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/60 shrink-0">
        <span className="text-sm font-semibold text-gray-700">{title}</span>
        {badge != null && (
          <span className="text-[11px] font-medium bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 leading-none">
            {badge}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading
          ? <Spinner />
          : error
            ? <div className="p-4 text-center"><p className="text-red-500 text-xs">{error}</p></div>
            : children
        }
      </div>
    </div>
  );
}

function Item({ label, sub, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative w-full text-left px-4 py-2.5 border-b border-gray-50 last:border-0 flex items-start gap-2 transition-colors ${
        selected ? 'bg-indigo-50' : 'hover:bg-gray-50'
      }`}
    >
      {selected && (
        <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-indigo-500" />
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${selected ? 'text-indigo-700' : 'text-gray-800'}`}>
          {label}
        </p>
        {sub && <p className="text-xs text-gray-500 truncate mt-0.5">{sub}</p>}
      </div>
      <Icon
        n="chevron-right"
        size={13}
        cls={`flex-shrink-0 mt-1 ${selected ? 'text-indigo-400' : 'text-gray-300'}`}
      />
    </button>
  );
}

function SeriesDetailCard({ series }) {
  const tags = series.MainDicomTags || {};
  const rows = [
    ['Modality',    tags.Modality            || '—'],
    ['Series #',    tags.SeriesNumber        || '—'],
    ['Description', tags.SeriesDescription   || '—'],
    ['Date',        fmtDate(tags.SeriesDate)],
    ['Instances',   series.Instances?.length ?? '—'],
    ['Status',      series.Status            || '—'],
  ];
  return (
    <div className="p-4 space-y-2">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Series Details</p>
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-start gap-2">
          <span className="text-xs text-gray-400 w-24 shrink-0">{k}</span>
          <span className="text-xs text-gray-800 font-medium break-all">{String(v)}</span>
        </div>
      ))}
      <div className="pt-2 border-t border-gray-100 mt-3">
        <p className="text-xs text-gray-400 mb-1">Orthanc ID</p>
        <p className="text-xs font-mono text-gray-500 break-all">{series.ID}</p>
      </div>
    </div>
  );
}

export default function BrowserTab() {
  const [mode, setMode] = useState('patients');

  // Level 1: all patients (patients mode) or all studies (studies mode)
  const [level1,  setLevel1]  = useState([]);
  const [loadL1,  setLoadL1]  = useState(false);
  const [errL1,   setErrL1]   = useState(null);
  const [selL1,   setSelL1]   = useState(null);

  // Level 2: patient's studies (patients mode) OR study's series (studies mode)
  const [level2,  setLevel2]  = useState([]);
  const [loadL2,  setLoadL2]  = useState(false);
  const [selL2,   setSelL2]   = useState(null);

  // Level 3: study's series — patients mode only
  const [level3,  setLevel3]  = useState([]);
  const [loadL3,  setLoadL3]  = useState(false);
  const [selL3,   setSelL3]   = useState(null);

  // The series that drives the instance viewer
  const viewerSeries = mode === 'patients' ? selL3 : selL2;

  const fetchLevel1 = useCallback(async (m) => {
    setLoadL1(true);
    setErrL1(null);
    try {
      const url = m === 'patients' ? '/patients?expand' : '/studies?expand';
      const r = await orthancClient.get(url);
      setLevel1(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      setErrL1(e.message);
    }
    setLoadL1(false);
  }, []);

  // Load level-1 data whenever mode changes
  useEffect(() => {
    setSelL1(null); setSelL2(null); setSelL3(null);
    setLevel2([]);  setLevel3([]);
    fetchLevel1(mode);
  }, [mode, fetchLevel1]);

  // Click a level-1 item (patient or study)
  const clickL1 = async (item) => {
    setSelL1(item);
    setSelL2(null);
    setSelL3(null);
    setLevel2([]);
    setLevel3([]);
    setLoadL2(true);
    try {
      const url = mode === 'patients'
        ? `/patients/${item.ID}/studies`
        : `/studies/${item.ID}/series`;
      const r = await orthancClient.get(url);
      setLevel2(Array.isArray(r.data) ? r.data : []);
    } catch { setLevel2([]); }
    setLoadL2(false);
  };

  // Click a level-2 item (study in patients mode, or series in studies mode)
  const clickL2 = async (item) => {
    setSelL2(item);
    setSelL3(null);
    if (mode === 'patients') {
      // item is a study — load its series into level3
      setLevel3([]);
      setLoadL3(true);
      try {
        const r = await orthancClient.get(`/studies/${item.ID}/series`);
        setLevel3(Array.isArray(r.data) ? r.data : []);
      } catch { setLevel3([]); }
      setLoadL3(false);
    }
    // studies mode: item is a series — viewerSeries updates automatically
  };

  // Click a level-3 item (series in patients mode only)
  const clickL3 = (item) => setSelL3(item);

  // --- Label helpers ---
  const l1Label = (item) =>
    mode === 'patients'
      ? fmtName(item.MainDicomTags?.PatientName)
      : item.MainDicomTags?.StudyDescription || 'Unnamed Study';

  const l1Sub = (item) => {
    if (mode === 'patients') {
      return `ID: ${item.MainDicomTags?.PatientID || '—'} · ${item.Studies?.length ?? 0} study`;
    }
    const parts = [];
    if (item.PatientMainDicomTags?.PatientName)
      parts.push(fmtName(item.PatientMainDicomTags.PatientName));
    if (item.MainDicomTags?.StudyDate)
      parts.push(fmtDate(item.MainDicomTags.StudyDate));
    return parts.join(' · ') || '—';
  };

  const l2Label = (item) =>
    mode === 'patients'
      ? item.MainDicomTags?.StudyDescription || 'Unnamed Study'
      : item.MainDicomTags?.SeriesDescription || `Series ${item.MainDicomTags?.SeriesNumber || '?'}`;

  const l2Sub = (item) => {
    if (mode === 'patients') {
      const cnt = item.Series?.length ?? 0;
      return `${fmtDate(item.MainDicomTags?.StudyDate)} · ${cnt} series`;
    }
    const mod = item.MainDicomTags?.Modality || '—';
    const cnt = item.Instances?.length ?? 0;
    return `${mod} · ${cnt} instance${cnt !== 1 ? 's' : ''}`;
  };

  const l3Label = (item) =>
    item.MainDicomTags?.SeriesDescription || `Series ${item.MainDicomTags?.SeriesNumber || '?'}`;

  const l3Sub = (item) => {
    const mod = item.MainDicomTags?.Modality || '—';
    const cnt = item.Instances?.length ?? 0;
    return `${mod} · ${cnt} instance${cnt !== 1 ? 's' : ''}`;
  };

  // Breadcrumb
  const crumbs = [];
  if (selL1) crumbs.push(l1Label(selL1));
  if (selL2) crumbs.push(l2Label(selL2));
  if (selL3) crumbs.push(l3Label(selL3));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setMode('patients')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                mode === 'patients' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon n="users" size={14} />Patients
            </button>
            <button
              onClick={() => setMode('studies')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                mode === 'studies' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon n="database" size={14} />All Studies
            </button>
          </div>

          {crumbs.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-500 flex-wrap">
              {crumbs.map((c, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <Icon n="chevron-right" size={11} cls="text-gray-400" />}
                  <span className={i === crumbs.length - 1 ? 'text-gray-800 font-medium' : ''}>{c}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => fetchLevel1(mode)}
          disabled={loadL1}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <Icon n="refresh" size={14} />Refresh
        </button>
      </div>

      {/* Three-column browser */}
      <div className="grid grid-cols-3 gap-3" style={{ minHeight: 320, height: 380 }}>

        {/* Column 1: Patients or All Studies */}
        <Panel
          title={mode === 'patients' ? 'Patients' : 'All Studies'}
          badge={level1.length || undefined}
          loading={loadL1}
          error={errL1}
        >
          {level1.length === 0 ? (
            <EmptyState
              icon={mode === 'patients' ? 'users' : 'database'}
              title={`No ${mode === 'patients' ? 'patients' : 'studies'} found`}
              sub="Upload a DICOM file to populate this list"
            />
          ) : level1.map(item => (
            <Item
              key={item.ID}
              label={l1Label(item)}
              sub={l1Sub(item)}
              selected={selL1?.ID === item.ID}
              onClick={() => clickL1(item)}
            />
          ))}
        </Panel>

        {/* Column 2:
            patients mode → patient's studies
            studies mode  → study's series */}
        <Panel
          title={mode === 'patients' ? 'Studies' : 'Series'}
          badge={selL1 ? level2.length : undefined}
          loading={loadL2}
        >
          {!selL1 ? (
            <EmptyState
              icon={mode === 'patients' ? 'users' : 'database'}
              title={`Select a ${mode === 'patients' ? 'patient' : 'study'}`}
              sub={`Choose from the list on the left`}
            />
          ) : level2.length === 0 && !loadL2 ? (
            <EmptyState
              icon={mode === 'patients' ? 'database' : 'layers'}
              title={`No ${mode === 'patients' ? 'studies' : 'series'} found`}
            />
          ) : level2.map(item => (
            <Item
              key={item.ID}
              label={l2Label(item)}
              sub={l2Sub(item)}
              selected={selL2?.ID === item.ID}
              onClick={() => clickL2(item)}
            />
          ))}
        </Panel>

        {/* Column 3:
            patients mode → study's series (selection target)
            studies mode  → series detail card (info panel) */}
        <Panel
          title={mode === 'patients' ? 'Series' : 'Series Info'}
          badge={mode === 'patients' && selL2 ? level3.length : undefined}
          loading={mode === 'patients' ? loadL3 : false}
        >
          {mode === 'patients' ? (
            !selL2 ? (
              <EmptyState icon="layers" title="Select a study" sub="Click a study to see its series" />
            ) : level3.length === 0 && !loadL3 ? (
              <EmptyState icon="layers" title="No series found" />
            ) : level3.map(item => (
              <Item
                key={item.ID}
                label={l3Label(item)}
                sub={l3Sub(item)}
                selected={selL3?.ID === item.ID}
                onClick={() => clickL3(item)}
              />
            ))
          ) : (
            selL2
              ? <SeriesDetailCard series={selL2} />
              : <EmptyState icon="layers" title="Select a series" sub="Click a series to view its details and instances" />
          )}
        </Panel>
      </div>

      {/* Instance Viewer — shown when a series is selected */}
      {viewerSeries && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Icon n="monitor" size={16} cls="text-indigo-500" />
            <h3 className="text-sm font-semibold text-gray-700">Instance Viewer</h3>
            <span className="text-xs text-gray-500">
              {viewerSeries.MainDicomTags?.SeriesDescription || 'Selected Series'}
              {viewerSeries.MainDicomTags?.Modality && ` · ${viewerSeries.MainDicomTags.Modality}`}
              {' · '}
              {viewerSeries.Instances?.length ?? 0} instance{viewerSeries.Instances?.length !== 1 ? 's' : ''}
            </span>
          </div>
          <SeriesInstanceViewer seriesId={viewerSeries.ID} />
        </div>
      )}
    </div>
  );
}
