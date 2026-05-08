# I. Browser Tab — Hierarchical DICOM Exploration

The Browser tab supports two modes. **Patients mode** drills down through Patient → Study → Series → Instance. **Studies mode** starts at Study → Series → Instance.

```mermaid
sequenceDiagram
    participant U as User / Browser
    participant ORT as Orthanc (localhost:8042)

    alt Patients mode
        U->>ORT: GET /patients?expand
        ORT-->>U: [ Patient objects ]

        Note over U: User selects a patient

        U->>ORT: GET /patients/{patientId}/studies
        ORT-->>U: [ Study objects ]

        Note over U: User selects a study

        U->>ORT: GET /studies/{studyId}/series
        ORT-->>U: [ Series objects ]

    else Studies mode
        U->>ORT: GET /studies?expand
        ORT-->>U: [ Study objects ]

        Note over U: User selects a study

        U->>ORT: GET /studies/{studyId}/series
        ORT-->>U: [ Series objects ]
    end

    Note over U: User selects a series<br/>SeriesInstanceViewer mounts

    U->>ORT: GET /series/{seriesId}/instances
    ORT-->>U: [ Instance objects ]
    Note over U: Sorted by InstanceNumber<br/>Capped at 60 instances

    loop For each instance (thumbnail strip)
        U->>ORT: GET /instances/{id}/preview
        ORT-->>U: image/jpeg blob
    end

    U->>ORT: GET /instances/{id}/rendered
    ORT-->>U: image/jpeg blob
    Note over U: Full-size image displayed
```
