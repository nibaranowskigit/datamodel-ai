export type HubSpotConfig = {
  apiKey: string;        // Private App token
  portalId?: string;
};

export type StripeConfig = {
  secretKey: string;     // sk_live_... or sk_test_...
};

export type IntercomConfig = {
  accessToken: string;
};

export type MixpanelConfig = {
  projectToken: string;
  serviceAccountUsername: string;
  serviceAccountSecret: string;
  activationEvent?: string;  // e.g. 'Project Created' — configurable per org
};

export type ConnectorConfig =
  | HubSpotConfig
  | StripeConfig
  | IntercomConfig
  | MixpanelConfig;

export interface SyncResult {
  recordsUpserted: number;
  fieldsUpdated: number;
}

// All connectors must implement this interface
export interface Connector {
  readonly sourceType: string;

  // Test credentials without pulling data
  testConnection(config: ConnectorConfig): Promise<{ ok: boolean; error?: string }>;

  // Pull all data and write to CDM/UDM
  sync(input: {
    orgId: string;
    sourceId: string;
    config: ConnectorConfig;
    businessType: 'b2b' | 'b2c';
  }): Promise<SyncResult>;
}
