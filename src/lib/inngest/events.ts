export type SyncSourceRequestedEvent = {
  name: 'sync/source.requested';
  data: {
    orgId: string;
    sourceId: string;
    sourceType: string;
  };
};

// Future events (S1.4)
// sync/all.requested
// sync/source.completed
// sync/source.failed

export type DatamodelEvents = SyncSourceRequestedEvent;
