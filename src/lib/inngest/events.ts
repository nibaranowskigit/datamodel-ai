export type SyncSourceRequestedEvent = {
  name: 'sync/source.requested';
  data: {
    orgId: string;
    sourceId: string;
    sourceType: string;
  };
};

export type OrgDataExportRequestedEvent = {
  name: 'org/data.export.requested';
  data: {
    orgId: string;
    requestedBy: string;
  };
};

export type FieldsProposalRequestedEvent = {
  name: 'fields/proposal.requested';
  data: {
    orgId: string;
    sourceId: string;
    sourceType: string;
    syncRunId: string;
  };
};

// Future events (S1.4)
// sync/all.requested
// sync/source.completed
// sync/source.failed

export type DatamodelEvents =
  | SyncSourceRequestedEvent
  | OrgDataExportRequestedEvent
  | FieldsProposalRequestedEvent;
