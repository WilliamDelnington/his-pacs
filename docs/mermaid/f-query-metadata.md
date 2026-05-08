# F. Step 5 — HIS Queries Orthanc for Metadata

Using the `ParentStudy` UUID from the upload response, the UI fetches full study metadata and statistics from Orthanc, then stores them back in HIS. Starts 300 ms after the Lua callback.

```mermaid
sequenceDiagram
    participant U as User / Browser
    participant ORT as Orthanc (localhost:8042)
    participant HIS as HIS (localhost:3000)

    Note over U: 300 ms after Lua callback

    U->>ORT: GET /studies/{parentStudyId}
    ORT-->>U: 200 OK
    Note over U: Response:<br/>{ ID, IsStable, MainDicomTags,<br/>  PatientMainDicomTags, Series[] }

    U->>ORT: GET /studies/{parentStudyId}/statistics
    ORT-->>U: 200 OK
    Note over U: Response:<br/>{ CountSeries, CountInstances, DiskSize }

    U->>HIS: POST /api/orders/{orderID}/metadata
    Note over U: Body:<br/>{ studyMetadata, instanceCount,<br/>  orthancStudyID }

    HIS-->>U: 200 OK
    Note over U: ✓ Step 5 marked complete<br/>meta & stats stored in state
```
