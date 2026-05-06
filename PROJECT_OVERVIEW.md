# Project Overview — HIS ↔ Orthanc Integration UI

## What This Application Does

This is a **full-stack integration UI** that connects a Hospital Information System (HIS) to an Orthanc DICOM PACS server. It demonstrates the complete medical imaging workflow that happens in a real hospital: a clinician creates an imaging order, a DICOM file is uploaded to the PACS, Orthanc notifies the HIS via a Lua webhook, and the resulting study is displayed in a DICOM viewer.

The application always connects to real services — there is no demo or simulation mode. You need:
- The **HIS mock server** running on port 3001 (`npm run server`)
- An **Orthanc instance** running on port 8042

---

## Services Between HIS and Orthanc

Six of the seven integration services are implemented. The table below maps each service to its direction, the specific mechanism used in this project, and its current status.

| # | Service | Direction | Status |
|---|---|---|---|
| 1 | Data Synchronization | HIS ↔ Orthanc | ✓ Implemented |
| 2 | Imaging Order Management | HIS | ✓ Implemented |
| 3 | Receive and Save Images/Instances | Orthanc | ✓ Implemented |
| 4 | A Link to HIS | Orthanc → HIS | ✓ Implemented |
| 5 | Status Synchronization | HIS → UI | ✓ Implemented |
| 6 | Querying and Viewing Images/Instances | UI → Orthanc | ✓ Implemented — workflow viewer + hierarchical browser |
| 7 | Providing Results | Orthanc → HIS | ✗ Not yet implemented |

---

### 1. Data Synchronization

**Direction:** HIS ↔ Orthanc

Patient demographics and study context flow in both directions:

- **HIS → Orthanc:** When a clinician creates an imaging order (Step 1), the patient name, patient ID, modality, and study description are captured. These fields are expected to be embedded into the DICOM file's tags before upload — in particular `PatientID` (0010,0020), `PatientName` (0010,0010), and `AccessionNumber` (0008,0050), which carries the `orderID`.
- **Orthanc → HIS:** After the DICOM file is stored, the UI fetches the study metadata from Orthanc (`GET /studies/{id}` and `GET /studies/{id}/statistics`) and writes it back to the HIS via `POST /api/orders/:id/metadata`. This synchronizes DICOM-level facts — `StudyInstanceUID`, study date, series count, instance count, and disk size — back into the HIS order record.

---

### 2. Imaging Order Management

**Direction:** HIS (internal)

The HIS is responsible for the full lifecycle of an imaging order:

- **Create** — `POST /api/orders` generates a unique `orderID` (e.g. `ORD-2026-412`) and sets the initial status to `PENDING`.
- **Track** — the order moves through three states: `PENDING → RECEIVED → COMPLETED`. Each transition is triggered by a specific event in the workflow (Lua callback, metadata fetch).
- **List and resume** — the Order List tab shows all orders from the current session. Selecting one restores the full workflow state, including status, metadata, and viewer URL if the order was already completed.
- **Persist** — orders are saved to `localStorage` in the browser, so they survive a page refresh (the HIS backend store is in-memory and resets on server restart).

---

### 3. Receive and Save Images/Instances

**Direction:** UI → Orthanc

The PACS receives DICOM files uploaded from the UI:

```
POST http://localhost:8042/instances
Content-Type: application/dicom
<raw binary .dcm content>
```

Orthanc validates the file against the DICOM standard, parses all headers, and indexes the instance into its study/series/instance hierarchy. It assigns internal UUIDs to the instance, series, study, and patient, then returns them in the response:

```json
{
  "ID":            "a1b2c3d4-...",
  "ParentStudy":   "e5f6a7b8-...",
  "ParentSeries":  "c9d0e1f2-...",
  "ParentPatient": "f3a4b5c6-...",
  "Status":        "Success"
}
```

If a duplicate instance is uploaded, Orthanc returns `Status: AlreadyStored` instead of creating a second copy.

---

### 4. A Link to HIS

**Direction:** Orthanc → HIS (via Lua callback)

This is the mechanism that closes the loop between the two systems. Without it, the HIS would never know a DICOM image had been received — an order would stay `PENDING` indefinitely.

When Orthanc stores a DICOM instance, it fires the `OnStoredInstance` Lua hook, which extracts the `AccessionNumber` tag from the file and POSTs it to the HIS:

```
POST http://localhost:3001/api/dicom-callback
{
  "instanceId":      "a1b2c3d4-...",
  "patientID":       "PAT-034",
  "accessionNumber": "ORD-2026-412",
  "studyUID":        "2.16.840.1.113669...."
}
```

The HIS looks up the order by `accessionNumber` (which equals `orderID`) and advances its status to `RECEIVED`. This is the only field that links the two systems — the `AccessionNumber` in the DICOM file is the foreign key between Orthanc and the HIS order database.

In this project the UI simulates this callback 400 ms after upload, since the real Lua hook fires server-to-server and would not be visible to the browser otherwise.

---

### 5. Status Synchronization

**Direction:** HIS → UI (real-time)

Order status changes are pushed to the UI in real time using Server-Sent Events (SSE):

```
GET http://localhost:3001/api/events
```

The UI subscribes on mount with `new EventSource(...)` and listens for `order-updated` events. Whenever the HIS updates an order — for example when the Lua callback arrives and the status moves to `RECEIVED` — it calls `broadcast('order-updated', order)`, which pushes the new state to every connected browser tab simultaneously. The timeline and order card update without any polling or page refresh.

The three status transitions and their triggers:

| From | To | Trigger |
|---|---|---|
| *(none)* | `PENDING` | `POST /api/orders` — order created |
| `PENDING` | `RECEIVED` | `POST /api/dicom-callback` — Lua callback received |
| `RECEIVED` | `COMPLETED` | Viewer URL computed and saved to the order |

---

### 6. Querying and Viewing Images/Instances

**Direction:** UI → Orthanc

Once a study is stored, the UI queries Orthanc directly to display the DICOM images inside the app:

| Request | Purpose |
|---|---|
| `GET /studies/{id}` | Fetch study-level DICOM tags and series list |
| `GET /studies/{id}/statistics` | Fetch series count, instance count, disk size |
| `GET /studies/{id}/instances` | List all instances in the study |
| `GET /instances/{id}/preview` | Load a JPEG thumbnail for the thumbnail strip |
| `GET /instances/{id}/rendered` | Load the full-resolution rendered frame |

The built-in `DicomViewer` component loads up to 60 instances from a study, sorts them by `InstanceNumber`, and renders thumbnails progressively. Clicking a thumbnail loads the full-resolution frame in the main panel. Prev/next buttons allow navigating sequentially.

A second component, `SeriesInstanceViewer`, provides the same UI but scoped to a single series (`GET /series/{id}/instances`). It is used by the DICOM Browser tab, where the user has explicitly drilled down to a specific series. See the [DICOM Hierarchy Browser](#dicom-hierarchy-browser) section for the full data-extraction flow.

In addition, a viewer URL is generated for external viewers:

| Viewer | URL format |
|---|---|
| Orthanc Explorer (built-in, no plugin needed) | `…/app/explorer.html#study?uuid={orthancStudyID}` |
| OHIF Viewer plugin | `…/ohif/viewer?StudyInstanceUIDs={dicomUID}` |
| Stone Web Viewer plugin | `…/stone-webviewer/index.html?StudyInstanceUIDs={dicomUID}` |

---

### 7. Providing Results *(not yet implemented)*

**Direction:** Orthanc → HIS

In a complete HIS-PACS integration, the radiologist's findings and report are sent from the PACS back to the HIS after a study is read. This closes the clinical workflow: order placed → images acquired → study read → report delivered → order closed.

This service is not implemented in the current project. The application has no mechanism for:
- A radiologist to record findings or dictate a report
- The PACS to push a completed report back to the HIS
- The HIS to mark an order as "reported" or "closed"

---

## Running the Application

```bash
npm install       # install dependencies
npm run dev       # starts UI on port 3000 AND HIS backend on port 3001
```

To configure Orthanc credentials or the viewer URL at runtime, click **Settings** in the top status bar. Defaults are:

```
Orthanc URL  : http://localhost:8042
Username     : admin
Password     : password
Viewer URL   : http://localhost:8042/app/explorer.html
```

---

## The 7-Step Workflow

Each step is owned by a specific system component. The status bar and timeline track progress through all 7 steps.

```
  Step 1        Step 2/3       Step 4          Step 5          Step 6/7
[HIS Order] → [Orthanc Upload] → [Lua Callback] → [Metadata] → [Viewer]
  HIS             Orthanc        Orthanc→HIS        HIS→Orthanc    UI
```

---

### Step 1 — Create Imaging Order `[HIS]`

**Tab:** Order  
**Trigger:** User fills in the form and clicks "POST /api/orders — Create Imaging Order"

The UI sends a JSON payload to the HIS backend:

```
POST http://localhost:3001/api/orders
```

```json
{
  "patientName": "Jack",
  "patientID": "PAT-034",
  "modality": "PT",
  "studyDescription": "Leg"
}
```

The HIS server generates a unique `orderID` (e.g. `ORD-2026-412`), sets the status to `PENDING`, and stores the order in memory. The UI then automatically switches to the Upload tab.

**Order status after this step:** `PENDING`

---

### Step 2 — Upload DICOM to Orthanc `[Orthanc]`

**Tab:** Upload  
**Trigger:** User selects a `.dcm` file and clicks "Upload"

The UI reads the file as a binary buffer and sends it to Orthanc:

```
POST http://localhost:8042/instances
Content-Type: application/dicom
<raw binary .dcm file>
```

Orthanc parses the DICOM headers, validates the file, and indexes it into its internal database. It returns a response that identifies exactly where the instance lives in the Orthanc hierarchy:

```json
{
  "ID":            "a1b2c3d4-...",
  "ParentStudy":   "e5f6a7b8-...",
  "ParentSeries":  "c9d0e1f2-...",
  "ParentPatient": "f3a4b5c6-...",
  "Status":        "Success"
}
```

The UI immediately notifies the HIS that the upload is complete:

```
POST http://localhost:3001/api/orders/ORD-2026-412/upload-complete
{ "instanceId": "...", "parentStudy": "...", "parentSeries": "..." }
```

### Step 3 — Instance Saved `[Orthanc]`

This step completes automatically alongside Step 2. When Orthanc returns `Status: Success`, it has already fully indexed the DICOM instance into its study/series/instance hierarchy. Steps 2 and 3 are marked complete together.

---

### Step 4 — Lua Callback: Orthanc Notifies HIS `[Orthanc→HIS]`

**Trigger:** 400 ms after upload — the UI simulates the Lua webhook

In a real deployment, Orthanc fires the `OnStoredInstance` Lua callback automatically every time an instance is stored. The Lua script (installed in `orthanc.lua`) extracts key DICOM tags and POSTs them back to the HIS:

```
POST http://localhost:3001/api/dicom-callback
{
  "instanceId":      "a1b2c3d4-...",
  "patientID":       "PAT-034",
  "accessionNumber": "ORD-2026-412",
  "studyUID":        "e5f6a7b8-..."
}
```

The HIS server receives this, looks up the order using `accessionNumber` (which maps to `orderID`), and updates its status to `RECEIVED`. It also broadcasts this update as a Server-Sent Event so any other connected clients see the change in real time.

In this demo app, the UI itself makes this same POST call 400 ms after the Orthanc upload completes, simulating the async callback. See the [Lua section below](#how-the-lua-callback-works) for the exact script.

**Order status after this step:** `RECEIVED`

---

### Step 5 — Fetch Study Metadata `[HIS→Orthanc]`

**Trigger:** Automatic, 300 ms after the Lua callback

The UI queries Orthanc for the full study metadata and statistics in parallel:

```
GET http://localhost:8042/studies/{parentStudy}
GET http://localhost:8042/studies/{parentStudy}/statistics
```

Orthanc returns the DICOM study-level tags — patient name, study date, `StudyInstanceUID`, modality — plus counts of series and instances and the disk size. The UI stores this metadata on the HIS:

```
POST http://localhost:3001/api/orders/ORD-2026-412/metadata
{ "studyMetadata": {...}, "instanceCount": 1, "orthancStudyID": "e5f6a7b8-..." }
```

This metadata is then shown in the **Callback & Metadata** tab.

---

### Step 6 — Generate Viewer URL `[HIS]`

**Trigger:** Automatic, immediately after metadata is stored

The UI constructs a viewer URL from the Orthanc study ID and the configured Viewer URL base. The format depends on which viewer is configured in Settings:

| Viewer | URL format |
|---|---|
| Orthanc Explorer (built-in) | `http://localhost:8042/app/explorer.html#study?uuid={orthancStudyID}` |
| OHIF Viewer plugin | `http://localhost:8042/ohif/viewer?StudyInstanceUIDs={dicomUID}` |
| Stone Web Viewer plugin | `http://localhost:8042/stone-webviewer/index.html?StudyInstanceUIDs={dicomUID}` |

The URL is saved to the order (`status → COMPLETED`) and the UI switches to the Viewer tab.

**Order status after this step:** `COMPLETED`

---

### Step 7 — View DICOM Images `[UI]`

**Tab:** Viewer

Two things appear on the Viewer tab:

1. **Viewer URL link** — opens the configured viewer (Orthanc Explorer / OHIF / Stone) in a new tab.
2. **Built-in DicomViewer component** — loads DICOM images directly from Orthanc without leaving the app:
   - `GET /studies/{id}/instances` — fetches the list of all instances in the study
   - `GET /instances/{id}/preview` — loads a JPEG thumbnail for each instance (shown in the thumbnail strip)
   - `GET /instances/{id}/rendered` — loads the full-resolution rendered frame for the selected instance

The viewer supports prev/next navigation and a thumbnail strip when a study has multiple instances.

---

## DICOM Hierarchy Browser

The **DICOM Browser** tab (added after the initial 7-step workflow) provides on-demand hierarchical navigation of everything stored in Orthanc. It is independent of the order workflow — no active order is required. A clinician or technician can open the browser at any time to explore any patient, study, or series already in the PACS.

### Entry Points

Two independent entry points are available via the toggle at the top of the tab:

| Mode | Starting point | Navigation path |
|---|---|---|
| **Patients** | All patients in Orthanc | Patient → Patient's Studies → Series → Instance Viewer |
| **All Studies** | All studies in Orthanc | Study → Series → Instance Viewer |

### How Data is Extracted

Every level in the hierarchy is loaded **on demand** — nothing is fetched until the user makes a selection. Each click triggers exactly one API call scoped to the selected resource.

#### Patients Mode — Full Call Sequence

**1. Load the patient list**

Triggered when the browser tab opens in Patients mode:

```
GET /patients?expand
```

Without `?expand` Orthanc returns only an array of IDs. With it, each element is a full patient object containing `MainDicomTags` (PatientName, PatientID, PatientBirthDate, PatientSex) and a `Studies` array of child study IDs.

```json
[
  {
    "ID": "16738bc3-e47ed42a-43ce044c-a3414a45-cb069bd0",
    "MainDicomTags": {
      "PatientID":        "PAT-001",
      "PatientName":      "NGUYEN^VAN A",
      "PatientBirthDate": "19850301",
      "PatientSex":       "M"
    },
    "Studies": ["27f7126f-4f66fb14-03f4081b-f9341db2-53925988"],
    "Type": "Patient"
  }
]
```

**2. User selects a patient → load that patient's studies**

```
GET /patients/{patientID}/studies
```

Returns an array of full study objects scoped to that patient. Each object includes `MainDicomTags` (StudyDate, StudyDescription, StudyInstanceUID, AccessionNumber), `PatientMainDicomTags`, and a `Series` array of child series IDs. This endpoint always returns expanded objects — no `?expand` parameter needed.

**3. User selects a study → load its series**

```
GET /studies/{studyID}/series
```

Returns an array of series objects for that study. Each includes `MainDicomTags` (Modality, SeriesDescription, SeriesNumber, SeriesDate), an `Instances` array of child instance IDs, and a `Status` field (e.g. `"Complete"`).

**4. User selects a series → Instance Viewer opens**

`SeriesInstanceViewer` takes the selected series ID and fetches every instance in that series:

```
GET /series/{seriesID}/instances
```

Returns an array of instance objects sorted by `InstanceNumber`. The viewer then fires two additional requests per instance:

```
GET /instances/{id}/preview          → JPEG thumbnail (fires in parallel for all instances)
GET /instances/{id}/rendered         → full-resolution frame (fires only for the selected instance)
```

#### Studies Mode — Call Sequence

In Studies mode the patient-selection step is skipped. The hierarchy collapses by one level.

**1. Load all studies**

```
GET /studies?expand
```

Returns all studies across all patients, each with full DICOM tags including `PatientMainDicomTags` so the patient name is visible in the list without a separate lookup.

**2. User selects a study → load its series**

```
GET /studies/{studyID}/series
```

Identical to Patients mode step 3.

**3. User selects a series → Instance Viewer opens**

```
GET /series/{seriesID}/instances
```

Identical to Patients mode step 4.

### Column Layout

The browser uses a fixed three-column panel layout. What each column shows changes based on the active mode:

| Column | Patients mode | Studies mode |
|---|---|---|
| **Column 1** | Patient list (`GET /patients?expand`) | All-studies list (`GET /studies?expand`) |
| **Column 2** | Studies for the selected patient (`GET /patients/{id}/studies`) | Series for the selected study (`GET /studies/{id}/series`) |
| **Column 3** | Series for the selected study — **selection list** (`GET /studies/{id}/series`) | Series detail card — **info panel** (no extra API call; data already loaded in Col 2) |
| **Bottom row** | `SeriesInstanceViewer` for the selected series | `SeriesInstanceViewer` for the selected series |

Column 3 is the key difference between modes. In Patients mode it is a clickable list because the series has not yet been selected; the user clicks one to open the viewer. In Studies mode the series was already selected in Column 2, so Column 3 shows a read-only metadata card (Modality, Series Number, Instance Count, Orthanc ID) instead of another list.

A breadcrumb above the columns tracks the full selection path (e.g. `Nguyen Van A › Chest CT › Series 1`) and updates at every level.

### SeriesInstanceViewer vs DicomViewer

The project contains two viewer components that render DICOM images from Orthanc:

| Component | Source endpoint | Used in |
|---|---|---|
| `DicomViewer` | `GET /studies/{studyId}/instances` | Viewer tab (7-step workflow) |
| `SeriesInstanceViewer` | `GET /series/{seriesId}/instances` | DICOM Browser tab |

`DicomViewer` fetches all instances across an entire study — correct for the workflow, where all uploaded instances belong to one study and should be shown together. `SeriesInstanceViewer` fetches only the instances of one specific series — correct for the browser, where the user has explicitly drilled down to a series and expects to see only that series' images. Both components share identical UI behaviour: thumbnail strip, prev/next navigation, progressive thumbnail loading, loading spinner, and error state.

---

## How the Lua Callback Works

The Lua callback is the bridge that closes the loop between Orthanc (PACS) and the HIS. Without it, the HIS would never know that a DICOM file was received — an order would stay `PENDING` forever.

### The Script

```lua
-- orthanc.lua
function OnStoredInstance(instanceId, tags, metadata, origin)
  local body = string.format(
    '{"instanceId":"%s","patientID":"%s",' ..
    '"accessionNumber":"%s","studyUID":"%s"}',
    instanceId,
    tags['PatientID']        or '',
    tags['AccessionNumber']  or '',
    tags['StudyInstanceUID'] or '')
  HttpPost(
    'http://localhost:3001/api/dicom-callback',
    body,
    {['Content-Type'] = 'application/json'})
end
```

### How It Works

**`OnStoredInstance`** is a built-in Orthanc Lua hook. Orthanc calls this function automatically in the Lua runtime every time it finishes storing a DICOM instance — no polling or external trigger needed.

The four parameters Orthanc passes to the function:

| Parameter | What it contains |
|---|---|
| `instanceId` | The Orthanc internal UUID for the stored instance |
| `tags` | A table of DICOM tags, e.g. `tags['PatientID']`, `tags['AccessionNumber']` |
| `metadata` | Orthanc-level metadata (transfer syntax, series type, etc.) |
| `origin` | How the instance arrived (REST API, DICOM C-STORE, Lua, etc.) |

**The critical link** is `AccessionNumber`. By convention, the HIS puts the `orderID` into the DICOM file's `AccessionNumber` tag (DICOM tag `0008,0050`) when creating the imaging order. When Orthanc receives the file, it extracts this tag and the Lua script sends it back to the HIS as `accessionNumber`. The HIS server looks up the order by that value:

```js
// server/index.js
app.post('/api/dicom-callback', (req, res) => {
  const { accessionNumber, studyUID, instanceId } = req.body;
  const order = orders.get(accessionNumber);   // accessionNumber === orderID
  if (order) {
    order.status   = 'RECEIVED';
    order.studyUID = studyUID;
    broadcast('order-updated', order);          // pushes SSE event to all connected UIs
  }
  res.json({ received: true });
});
```

### Installing the Script in Orthanc

1. Save the script as `orthanc.lua` in the same directory as your Orthanc configuration file.
2. Add this line to `orthanc.json`:
   ```json
   "LuaScripts": ["orthanc.lua"]
   ```
3. Restart Orthanc. From this point, every stored instance will trigger the callback.

### Why the UI Simulates the Callback

In this app the UI itself POSTs to `/api/dicom-callback` 400 ms after upload succeeds. This is because the Orthanc Lua script runs server-side and calls back to port 3001 directly — the browser UI never sees that event unless the HIS pushes it via SSE. In a full production setup the Lua hook fires on its own; in this demo the UI performs the same call so you can see the step complete without needing Orthanc's Lua runtime configured.

---

## Real-Time Updates via SSE

The HIS backend streams order state changes to the UI using **Server-Sent Events**:

```
GET http://localhost:3001/api/events
```

The UI subscribes on mount via `new EventSource(...)` and listens for `order-updated` events. When the Lua callback handler calls `broadcast('order-updated', order)`, every connected browser tab receives the new order state and updates the timeline automatically — no polling required.

---

## Architecture & Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| **Frontend** | React 19 (Create React App) | Hooks-based, no external state library |
| **Styling** | Tailwind CSS (CDN) | Loaded from `cdn.tailwindcss.com` in `public/index.html` |
| **HTTP Client** | Axios | Separate clients for HIS and Orthanc with response error interceptors |
| **HIS Mock Backend** | Node.js + Express (port 3001) | In-memory order store — orders are lost on server restart |
| **PACS Server** | Orthanc (port 8042) | External service; must be running before use |
| **Real-time** | Server-Sent Events (`EventSource`) | Streams order status updates from HIS to UI |
| **Dev Proxy** | `http-proxy-middleware` (`setupProxy.js`) | `/api/*` → port 3001, `/orthanc/*` → port 8042 |
| **Concurrency** | `concurrently` | `npm run dev` starts both UI and backend in one terminal |

---

## Important Files

### Root

| File | Purpose |
|---|---|
| [package.json](package.json) | Scripts: `start` (UI only), `server` (HIS only), `dev` (both), `build` |
| [orthanc-openapi.json](orthanc-openapi.json) | Full Orthanc OpenAPI spec (239 endpoints) — reference for all API shapes |

### `server/`

| File | Purpose |
|---|---|
| [server/index.js](server/index.js) | **HIS mock backend.** In-memory order store. Endpoints: `POST /api/orders`, `GET /api/orders`, `GET /api/orders/:id`, `POST /api/orders/:id/upload-complete`, `POST /api/dicom-callback`, `POST /api/orders/:id/metadata`, `GET /api/events` (SSE) |

### `src/` — Frontend

| File | Purpose |
|---|---|
| [src/App.js](src/App.js) | **Root component.** Owns all workflow state. Orchestrates the 7-step sequence, manages all API calls, handles the activity log and timeline. |
| [src/setupProxy.js](src/setupProxy.js) | Dev proxy: `/api/*` → `localhost:3001`, `/orthanc/*` → `localhost:8042` |
| [src/index.css](src/index.css) | Global styles: JSON syntax highlighting, `spin`/`pulse-ring`/`slide-in` animations |

### `src/api/`

| File | Purpose |
|---|---|
| [src/api/hisClient.js](src/api/hisClient.js) | Axios instance for HIS (`localhost:3000/api/*`). Extracts `response.data.message` from error responses for clean activity log entries. |
| [src/api/orthancClient.js](src/api/orthancClient.js) | Axios instance for Orthanc (proxied via `localhost:3000/orthanc`). `configureOrthanc(url, user, pass)` sets Basic Auth at runtime. |

### `src/tabs/` — Tab Views

| File | Step | Purpose |
|---|---|---|
| [src/tabs/OrderTab.jsx](src/tabs/OrderTab.jsx) | 1 | Order creation form. Fields: patient name, patient ID, modality, study description. |
| [src/tabs/UploadTab.jsx](src/tabs/UploadTab.jsx) | 2–3 | File picker and upload button. Accepts `.dcm` files. Shows instance/study/series IDs after upload. |
| [src/tabs/CallbackTab.jsx](src/tabs/CallbackTab.jsx) | 4–5 | Displays the Lua callback payload and the full study metadata from Orthanc. |
| [src/tabs/ViewerTab.jsx](src/tabs/ViewerTab.jsx) | 6–7 | Viewer URL with open-in-new-tab button, plus the built-in DicomViewer component. |
| [src/tabs/OrderListTab.jsx](src/tabs/OrderListTab.jsx) | — | Lists all orders from this session. Clicking one restores that order's workflow state. |
| [src/tabs/LogsTab.jsx](src/tabs/LogsTab.jsx) | — | Auto-scrolling color-coded activity log (HIS / Orthanc / error / info). |
| [src/tabs/BrowserTab.jsx](src/tabs/BrowserTab.jsx) | — | **DICOM Hierarchy Browser.** Two-mode (Patients / All Studies) three-column browser. Each click fires one scoped API call. Renders `SeriesInstanceViewer` when a series is selected. |

### `src/components/`

| File | Purpose |
|---|---|
| [src/components/DicomViewer.jsx](src/components/DicomViewer.jsx) | Renders DICOM images from Orthanc (`/preview`, `/rendered`). Fetches by **study** (`GET /studies/{id}/instances`). Thumbnail strip + prev/next navigation. |
| [src/components/SeriesInstanceViewer.jsx](src/components/SeriesInstanceViewer.jsx) | Same UI as `DicomViewer` but fetches by **series** (`GET /series/{id}/instances`). Used by the DICOM Browser tab after the user drills down to a specific series. |
| [src/components/timeline/Timeline.jsx](src/components/timeline/Timeline.jsx) | 7-step visual workflow tracker with step ownership badges (HIS / Orthanc / UI). |
| [src/components/StatusBar.jsx](src/components/StatusBar.jsx) | Top bar: HIS and Orthanc connectivity dots, Orthanc version/AET badge, Settings button. |
| [src/components/OrderCard.jsx](src/components/OrderCard.jsx) | Right-sidebar card showing the active order fields and a 7-step checklist. |
| [src/components/LuaCard.jsx](src/components/LuaCard.jsx) | Collapsible panel with the `OnStoredInstance` Lua script and key Orthanc API endpoints. |
| [src/components/Settings.jsx](src/components/Settings.jsx) | Modal for configuring Orthanc URL, credentials, and viewer URL at runtime. |

### `src/constants/`

| File | Purpose |
|---|---|
| [src/constants/steps.js](src/constants/steps.js) | Defines the 7 workflow steps with labels, icons, and owner (HIS / Orthanc / UI). |
| [src/constants/mock.js](src/constants/mock.js) | Exports only `wait(ms)` — used for small UI-pacing delays between workflow steps. |
| [src/constants/icons.js](src/constants/icons.js) | Inline SVG path definitions for all icons used in the app. Includes `users` (patient group) and `layers` (series stack) added for the DICOM Browser. |
