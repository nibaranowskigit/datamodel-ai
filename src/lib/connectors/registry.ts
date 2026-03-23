import { Connector } from './types';
import { hubspotConnector }  from './hubspot';
import { stripeConnector }   from './stripe';
import { intercomConnector } from './intercom';
// S1.3: import { mixpanelConnector } from './mixpanel';

const registry = new Map<string, Connector>([
  ['hubspot',  hubspotConnector],
  ['stripe',   stripeConnector],
  ['intercom', intercomConnector],
  // ['mixpanel', mixpanelConnector],
]);

export function getConnector(sourceType: string): Connector {
  const connector = registry.get(sourceType);
  if (!connector) throw new Error(`No connector registered for source type: ${sourceType}`);
  return connector;
}
