const express = require('express');

const app  = express();
const PORT = 3001;

app.use(express.json());

// In-memory store
const orders = new Map();
let   sseClients = [];

// ── SSE helper ──────────────────────────────────────────────────────────────
function broadcast(event, payload) {
  const chunk = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  sseClients.forEach(res => res.write(chunk));
}

// ── Health ───────────────────────────────────────────────────────────────────
app.get('/',           (_req, res) => res.json({ status: 'ok' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ── SSE stream ───────────────────────────────────────────────────────────────
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();
  sseClients.push(res);
  req.on('close', () => { sseClients = sseClients.filter(c => c !== res); });
});

// ── Orders ───────────────────────────────────────────────────────────────────
app.post('/api/orders', (req, res) => {
  const { patientName, patientID, modality, studyDescription } = req.body;
  const n = String(Math.floor(Math.random() * 900) + 100);
  const order = {
    orderID:          `ORD-${new Date().getFullYear()}-${n}`,
    patientID,
    patientName,
    modality,
    studyDescription,
    status:           'PENDING',
    createdAt:        new Date().toISOString(),
  };
  orders.set(order.orderID, order);
  console.log(`[HIS] Order created: ${order.orderID}`);
  res.json(order);
});

app.get('/api/orders', (_req, res) => {
  res.json([...orders.values()]);
});

app.get('/api/orders/:id', (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  res.json(order);
});

// ── Upload complete notification ─────────────────────────────────────────────
app.post('/api/orders/:id/upload-complete', (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  Object.assign(order, req.body);
  res.json(order);
});

// ── Lua callback from Orthanc OnStoredInstance ───────────────────────────────
app.post('/api/dicom-callback', (req, res) => {
  const { accessionNumber, studyUID, instanceId } = req.body;
  console.log(`[HIS] Lua callback — accession: ${accessionNumber}, instance: ${instanceId}`);
  const order = orders.get(accessionNumber);
  if (order) {
    order.status   = 'RECEIVED';
    order.studyUID = studyUID;
    broadcast('order-updated', order);
  }
  res.json({ received: true });
});

// ── Metadata from Orthanc ────────────────────────────────────────────────────
app.post('/api/orders/:id/metadata', (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  order.metadata = req.body;
  res.json(order);
});

// ── Viewer URL ───────────────────────────────────────────────────────────────
app.get('/api/orders/:id/viewer-url', (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (!order.metadata?.studyMetadata?.MainDicomTags?.StudyInstanceUID) {
    return res.status(409).json({ message: 'Study metadata not yet available' });
  }
  const uid = order.metadata.studyMetadata.MainDicomTags.StudyInstanceUID;
  res.json({ viewerURL: `http://localhost:8042/ohif/viewer?StudyInstanceUIDs=${uid}` });
});

// ────────────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`HIS mock server listening on http://localhost:${PORT}`);
});
