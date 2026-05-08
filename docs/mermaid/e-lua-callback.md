# E. Step 4 — Orthanc Lua Callback → HIS

Orthanc's `OnStoredInstance` Lua hook fires after every saved instance and POSTs a notification to HIS. In the demo this is simulated with a 400 ms delay after the upload. HIS transitions the order from `PENDING` → `RECEIVED`.

```mermaid
sequenceDiagram
    participant ORT as Orthanc (localhost:8042)
    participant HIS as HIS (localhost:3000)
    participant U as User / Browser

    Note over ORT: OnStoredInstance Lua hook fires<br/>(demo: simulated 400 ms after upload)

    ORT->>HIS: POST /api/dicom-callback
    Note over ORT: Body:<br/>{ instanceId,<br/>  patientID,<br/>  accessionNumber,<br/>  studyUID }

    HIS-->>ORT: 200 OK
    Note over HIS: Order status:<br/>PENDING → RECEIVED

    HIS-->>U: (SSE) order-updated
    Note over U: ✓ Step 4 marked complete<br/>Callback payload stored in state
```
