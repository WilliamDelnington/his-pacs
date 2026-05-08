# G. Step 6 — Viewer URL Ready

HIS constructs the viewer URL from the configured base URL and the `StudyInstanceUID` extracted from the study metadata. Order status transitions to `COMPLETED`. Runs 200 ms after metadata is stored.

```mermaid
sequenceDiagram
    participant U as User / Browser
    participant HIS as HIS (localhost:3000)

    Note over U: 200 ms after metadata stored

    Note over U: Builds viewerURL locally:<br/>cfg.viewerUrl + "?StudyInstanceUIDs=" + studyInstanceUID

    Note over U: Supported viewer patterns:<br/>• OHIF: /ohif/viewer?StudyInstanceUIDs={uid}<br/>• Stone: /stone-webviewer/index.html?study={uid}<br/>• Explorer: /app/explorer.html#instance?uuid={id}

    U->>HIS: (state update) order status → COMPLETED
    HIS-->>U: order-updated (SSE)

    Note over U: ✓ Steps 6 & 7 marked complete<br/>vUrl stored in state<br/>Tab switches → Viewer
```
