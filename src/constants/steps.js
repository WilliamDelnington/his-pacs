export const STEPS = [
  { n: 1, label: 'Order Created',    owner: 'HIS',         ic: 'file-text' },
  { n: 2, label: 'DICOM Uploaded',   owner: 'Orthanc',     ic: 'upload'    },
  { n: 3, label: 'Instance Saved',   owner: 'Orthanc',     ic: 'database'  },
  { n: 4, label: 'Lua Callback',     owner: 'Orthanc→HIS', ic: 'zap'       },
  { n: 5, label: 'Metadata Fetched', owner: 'HIS',         ic: 'activity'  },
  { n: 6, label: 'Viewer URL Ready', owner: 'HIS',         ic: 'link'      },
  { n: 7, label: 'View Images',      owner: 'UI',          ic: 'monitor'   },
];
