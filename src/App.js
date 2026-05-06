import { useState, useEffect, useRef, useCallback } from 'react';

import hisClient from './api/hisClient';
import orthancClient, { configureOrthanc } from './api/orthancClient';

import { wait } from './constants/mock';

import Icon from './components/ui/Icon';
import Badge from './components/ui/Badge';
import Timeline from './components/timeline/Timeline';
import StatusBar from './components/StatusBar';
import Settings from './components/Settings';
import OrderCard from './components/OrderCard';
import LuaCard from './components/LuaCard';

import OrderTab from './tabs/OrderTab';
import UploadTab from './tabs/UploadTab';
import CallbackTab from './tabs/CallbackTab';
import ViewerTab from './tabs/ViewerTab';
import LogsTab from './tabs/LogsTab';
import OrderListTab from './tabs/OrderListTab';
import BrowserTab from './tabs/BrowserTab';

const TABS = [
  { id: 'order',    label: 'Order',               ic: 'file-text' },
  { id: 'upload',   label: 'Upload',              ic: 'upload'    },
  { id: 'callback', label: 'Callback & Metadata', ic: 'zap'       },
  { id: 'viewer',   label: 'Viewer',              ic: 'monitor'   },
  { id: 'browser',  label: 'DICOM Browser',       ic: 'layers'    },
  { id: 'orders',   label: 'Order List',          ic: 'list'      },
  { id: 'logs',     label: 'Activity Log',        ic: 'activity'  },
];

const STATUS_VARIANT = { PENDING: 'pending', RECEIVED: 'received', COMPLETED: 'completed' };

const DEFAULT_CFG = {
  orthancUrl: 'http://localhost:8042',
  username:   'admin',
  password:   'password',
  viewerUrl:  'http://localhost:8042/app/explorer.html',
};

export default function App() {
  const [cfg,           setCfg]           = useState(DEFAULT_CFG);
  const [showSettings,  setShowSettings]  = useState(false);
  const [hisStatus,     setHisStatus]     = useState('checking');
  const [orthancStatus, setOrthancStatus] = useState('checking');
  const [orthSys,       setOrthSys]       = useState(null);

  const [orders, setOrders] = useState(() => {
    try { return JSON.parse(localStorage.getItem('his_orders') || '[]'); } catch { return []; }
  });
  const [order,  setOrder]  = useState(null);
  const [done,   setDone]   = useState([]);
  const [active, setActive] = useState(null);
  const [upload, setUpload] = useState(null);
  const [cb,     setCb]     = useState(null);
  const [meta,   setMeta]   = useState(null);
  const [stats,  setStats]  = useState(null);
  const [vUrl,   setVUrl]   = useState(null);
  const [file,   setFile]   = useState(null);
  const fileRef = useRef(null);

  const [form,    setForm]    = useState({ patientName: 'Nguyen Van A', patientID: 'PAT-001', modality: 'CT', studyDescription: 'Chest CT' });
  const [loadOrd, setLoadOrd] = useState(false);
  const [loadUp,  setLoadUp]  = useState(false);
  const [tab,     setTab]     = useState('order');
  const [logs,    setLogs]    = useState([]);

  const log = useCallback((msg, t = 'info') => {
    setLogs(p => [...p.slice(-79), { msg, t, time: new Date().toLocaleTimeString() }]);
  }, []);

  const mark = useCallback(steps => {
    setDone(p => [...new Set([...p, ...(Array.isArray(steps) ? steps : [steps])])]);
  }, []);

  const updateOrder = useCallback(updater => {
    setOrder(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next) {
        setOrders(list => {
          const idx = list.findIndex(o => o.orderID === next.orderID);
          if (idx === -1) return [...list, next];
          const arr = [...list];
          arr[idx] = next;
          return arr;
        });
      }
      return next;
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('his_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    configureOrthanc(cfg.orthancUrl, cfg.username, cfg.password);
  }, [cfg.orthancUrl, cfg.username, cfg.password]);

  const checkStatus = useCallback(async () => {
    try {
      await hisClient.get('/');
      setHisStatus('online');
    } catch {
      setHisStatus('offline');
    }
    try {
      const r = await orthancClient.get('/system');
      setOrthancStatus('online');
      setOrthSys(r.data);
    } catch {
      setOrthancStatus('offline');
      setOrthSys(null);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const id = setInterval(checkStatus, 12000);
    return () => clearInterval(id);
  }, [checkStatus]);

  useEffect(() => {
    const es = new EventSource(`${hisClient.defaults.baseURL}/api/events`);
    es.addEventListener('order-updated', e => {
      const d = JSON.parse(e.data);
      updateOrder(prev => prev && prev.orderID === d.orderID ? d : prev);
    });
    return () => es.close();
  }, []);

  const createOrder = async () => {
    setLoadOrd(true);
    log(`[HIS] POST /api/orders — patient: ${form.patientName} (${form.patientID}), modality: ${form.modality}`, 'his');
    try {
      const r = await hisClient.post('/api/orders', form);
      const o = r.data;
      updateOrder(o); mark([1]); setActive(2); setTab('upload');
      log(`[HIS] ✓ 201 — orderID: ${o.orderID}, status: PENDING`, 'his');
    } catch (e) { log(`[HIS] ✗ ${e.message}`, 'error'); }
    setLoadOrd(false);
  };

  const uploadDicom = async () => {
    if (!order) return;
    if (!file) { log('[Error] No DICOM file selected', 'error'); return; }
    setLoadUp(true);
    try {
      // Step 2: Upload DICOM instance to Orthanc
      log(`[Orthanc] POST /instances — ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, 'orthanc');
      const buf = await file.arrayBuffer();
      const r = await orthancClient.post('/instances', buf, {
        headers: { 'Content-Type': 'application/dicom' },
      });
      const up = r.data;
      if (up.Status === 'Failure') throw new Error('Orthanc rejected the instance (Status: Failure)');
      setUpload(up); mark([2, 3]); setActive(4);
      log(`[Orthanc] ✓ 200 — Status: ${up.Status}`, 'orthanc');
      log(`[Orthanc]   Instance: ${up.ID}`, 'orthanc');
      log(`[Orthanc]   Study:    ${up.ParentStudy}`, 'orthanc');
      log(`[Orthanc]   Series:   ${up.ParentSeries}`, 'orthanc');

      // Notify HIS that upload is complete
      log(`[HIS] POST /api/orders/${order.orderID}/upload-complete`, 'his');
      await hisClient.post(`/api/orders/${order.orderID}/upload-complete`, {
        instanceId: up.ID, parentStudy: up.ParentStudy, parentSeries: up.ParentSeries,
      });
      log('[HIS] ✓ upload-complete acknowledged', 'his');

      // Step 4: Simulate Lua OnStoredInstance callback (Orthanc → HIS)
      await wait(400);
      log(`[Orthanc→HIS] POST /api/dicom-callback — accession: ${order.orderID}`, 'orthanc');
      const cbPay = { instanceId: up.ID, patientID: order.patientID, accessionNumber: order.orderID, studyUID: up.ParentStudy };
      await hisClient.post('/api/dicom-callback', cbPay);
      setCb(cbPay);
      updateOrder(p => p ? { ...p, status: 'RECEIVED', studyUID: up.ParentStudy } : p);
      mark([4]); setActive(5);
      log('[HIS] ✓ 200 — order → RECEIVED', 'his');

      // Step 5: Fetch study metadata from Orthanc
      await wait(300);
      log(`[Orthanc] GET /studies/${up.ParentStudy}`, 'orthanc');
      log(`[Orthanc] GET /studies/${up.ParentStudy}/statistics`, 'orthanc');
      const [r1, r2] = await Promise.all([
        orthancClient.get(`/studies/${up.ParentStudy}`),
        orthancClient.get(`/studies/${up.ParentStudy}/statistics`),
      ]);
      const m = r1.data, s = r2.data;
      const dicomUID = m?.MainDicomTags?.StudyInstanceUID;
      log(`[Orthanc] ✓ ${s.CountSeries} series, ${s.CountInstances} instances`, 'orthanc');
      log(`[Orthanc]   StudyInstanceUID: ${dicomUID}`, 'orthanc');

      log(`[HIS] POST /api/orders/${order.orderID}/metadata`, 'his');
      await hisClient.post(`/api/orders/${order.orderID}/metadata`, {
        studyMetadata: m, instanceCount: s.CountInstances, orthancStudyID: up.ParentStudy,
      });
      log('[HIS] ✓ metadata stored', 'his');
      setMeta(m); setStats(s); mark([5]); setActive(6);

      // Step 6: Build viewer URL
      await wait(200);
      const viewer = cfg.viewerUrl.includes('explorer.html')
        ? `${cfg.viewerUrl}#study?uuid=${up.ParentStudy}`
        : `${cfg.viewerUrl}?StudyInstanceUIDs=${dicomUID}`;
      setVUrl(viewer);
      updateOrder(p => p ? { ...p, status: 'COMPLETED', viewerURL: viewer } : p);
      mark([6, 7]); setActive(null); setTab('viewer');
      log(`[HIS] ✓ viewerURL: ${viewer}`, 'his');
      log('[HIS] ✓ Workflow COMPLETE', 'his');

    } catch (e) { log(`[Error] ${e.message}`, 'error'); }
    setLoadUp(false);
  };

  const reset = () => {
    setOrder(null); setDone([]); setActive(null); setUpload(null);
    setCb(null); setMeta(null); setStats(null); setVUrl(null);
    setFile(null); setTab('order'); setLogs([]);
    log('Reset — ready for new workflow.', 'info');
  };

  const selectOrder = useCallback(o => {
    setOrder(o);
    if (o.status === 'COMPLETED') {
      if (o.viewerURL) setVUrl(o.viewerURL);
      setTab('viewer');
    } else if (o.status === 'RECEIVED') {
      setTab('callback');
    } else {
      setTab('upload');
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <StatusBar
        his={hisStatus}
        orthanc={orthancStatus}
        orthSys={orthSys}
        onSettings={() => setShowSettings(true)}
      />
      <Settings show={showSettings} onClose={() => setShowSettings(false)} cfg={cfg} onSave={setCfg} />

      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Icon n="activity" size={22} cls="text-indigo-600" />
              HIS ↔ Orthanc Integration
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Hospital Information System · DICOM Imaging Workflow · 7-Step Pipeline
            </p>
          </div>
          <div className="flex items-center gap-3">
            {order && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400">Order:</span>
                <span className="font-mono font-bold text-gray-800">{order.orderID}</span>
                <Badge v={STATUS_VARIANT[order.status] || 'default'}>{order.status}</Badge>
              </div>
            )}
            <button
              onClick={reset}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Icon n="refresh" size={14} />Reset
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-5 space-y-4">
        <Timeline done={done} active={active} />

        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon n={t.ic} size={14} />{t.label}
            </button>
          ))}
        </div>

        {tab === 'browser' ? (
          <BrowserTab />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            <div className="lg:col-span-2 space-y-4">
              {tab === 'order'    && <OrderTab    form={form} setForm={setForm} onSubmit={createOrder} loading={loadOrd} done={done} />}
              {tab === 'upload'   && <UploadTab   order={order} onUpload={uploadDicom} loading={loadUp} result={upload} file={file} setFile={setFile} fileRef={fileRef} done={done} />}
              {tab === 'callback' && <CallbackTab cb={cb} meta={meta} stats={stats} done={done} />}
              {tab === 'viewer'   && <ViewerTab   vUrl={vUrl} meta={meta} stats={stats} order={order} done={done} />}
              {tab === 'orders'   && <OrderListTab orders={orders} onSelect={selectOrder} />}
              {tab === 'logs'     && <LogsTab     logs={logs} />}
            </div>
            <div className="space-y-4">
              <OrderCard order={order} done={done} />
              <LuaCard />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
