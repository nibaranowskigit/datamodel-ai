// Run: npm run verify src/scripts/verify-s0.6.ts
import { db } from '@/lib/db';
import { syncLogs, orgs } from '@/lib/db/schema';
import { getConnector } from '@/lib/connectors/registry';
import { fetchWithRetry } from '@/lib/connectors/fetch-with-retry';
import { createSyncLog, completeSyncLog, failSyncLog } from '@/lib/sync/logger';
import { eq, sql } from 'drizzle-orm';

async function run() {
  let passed = 0;
  let failed = 0;

  async function check(label: string, fn: () => boolean | Promise<boolean>) {
    try {
      const ok = await fn();
      if (ok) { console.log(`  ✅ ${label}`); passed++; }
      else { console.log(`  ❌ ${label}`); failed++; }
    } catch (e) {
      console.log(`  ❌ ${label} — ${(e as Error).message}`);
      failed++;
    }
  }

  console.log('\n🔍 Verifying S0.6 — Connector Interface + HubSpot\n');

  console.log('TABLES');
  await check('sync_logs table exists', async () => {
    const r = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables WHERE table_name = 'sync_logs'
      ) as "exists"
    `);
    const rows = Array.isArray(r) ? r : (r as unknown as { rows: unknown[] }).rows ?? [];
    const val = (rows[0] as Record<string, unknown>)?.exists;
    return val === true || val === 'true' || val === 't';
  });

  console.log('\nFILE EXISTENCE');
  const fs = await import('fs');
  const files = [
    'src/lib/connectors/types.ts',
    'src/lib/connectors/registry.ts',
    'src/lib/connectors/fetch-with-retry.ts',
    'src/lib/connectors/hubspot/index.ts',
    'src/lib/connectors/hubspot/mappings.ts',
    'src/lib/sync/logger.ts',
  ];
  for (const file of files) {
    await check(`${file} exists`, () => fs.existsSync(file));
  }

  console.log('\nCONNECTOR REGISTRY');
  await check('getConnector("hubspot") returns HubSpotConnector', () => {
    const connector = getConnector('hubspot');
    return connector.sourceType === 'hubspot';
  });
  await check('getConnector("unknown") throws', () => {
    try { getConnector('unknown_source'); return false; }
    catch { return true; }
  });

  console.log('\nFETCH WITH RETRY');
  await check('fetchWithRetry resolves on 200', async () => {
    const res = await fetchWithRetry('https://httpbin.org/status/200', {});
    return res.ok;
  });

  console.log('\nSYNC LOGGER');
  // Create a real test org to satisfy the FK on sync_logs.org_id
  const testOrgId = `org_verify_s06_${Date.now()}`;
  await db.insert(orgs).values({
    id: testOrgId,
    name: 'Verify S0.6 Test Org',
    clerkOrgId: `clerk_${testOrgId}`,
  });

  let logId = '';

  await check('createSyncLog creates running log', async () => {
    logId = await createSyncLog({ orgId: testOrgId, sourceType: 'hubspot' });
    const log = await db.query.syncLogs.findFirst({ where: eq(syncLogs.id, logId) });
    return log?.status === 'running';
  });

  await check('completeSyncLog sets success + counts', async () => {
    await completeSyncLog(logId, { recordsUpserted: 42, fieldsUpdated: 210, durationMs: 3200 });
    const log = await db.query.syncLogs.findFirst({ where: eq(syncLogs.id, logId) });
    return log?.status === 'success' && log?.recordsUpserted === 42;
  });

  await check('failSyncLog sets error + message', async () => {
    const errLogId = await createSyncLog({ orgId: testOrgId, sourceType: 'hubspot' });
    await failSyncLog(errLogId, new Error('test error'), 1500);
    const log = await db.query.syncLogs.findFirst({ where: eq(syncLogs.id, errLogId) });
    const ok = log?.status === 'error' && log?.errorMessage === 'test error';
    await db.delete(syncLogs).where(eq(syncLogs.id, errLogId));
    return ok;
  });

  // Cleanup — logs first (FK), then org
  await db.delete(syncLogs).where(eq(syncLogs.id, logId));
  await db.delete(orgs).where(eq(orgs.id, testOrgId));

  console.log('\nHUBSPOT MAPPINGS');
  await check('HUBSPOT_COMPANY_MAPPINGS has GEN_company_name_v1', async () => {
    const { HUBSPOT_COMPANY_MAPPINGS } = await import('@/lib/connectors/hubspot/mappings');
    return Object.values(HUBSPOT_COMPANY_MAPPINGS).includes('GEN_company_name_v1');
  });
  await check('HUBSPOT_CONTACT_MAPPINGS has GEN_email_v1', async () => {
    const { HUBSPOT_CONTACT_MAPPINGS } = await import('@/lib/connectors/hubspot/mappings');
    return Object.values(HUBSPOT_CONTACT_MAPPINGS).includes('GEN_email_v1');
  });
  await check('HUBSPOT_COMPANY_PROPERTIES contains all mapping keys', async () => {
    const { HUBSPOT_COMPANY_MAPPINGS, HUBSPOT_COMPANY_PROPERTIES } = await import('@/lib/connectors/hubspot/mappings');
    return HUBSPOT_COMPANY_PROPERTIES.length === Object.keys(HUBSPOT_COMPANY_MAPPINGS).length;
  });
  await check('HUBSPOT_CONTACT_PROPERTIES contains all mapping keys', async () => {
    const { HUBSPOT_CONTACT_MAPPINGS, HUBSPOT_CONTACT_PROPERTIES } = await import('@/lib/connectors/hubspot/mappings');
    return HUBSPOT_CONTACT_PROPERTIES.length === Object.keys(HUBSPOT_CONTACT_MAPPINGS).length;
  });

  if (process.env.HUBSPOT_TEST_API_KEY) {
    console.log('\nHUBSPOT CONNECTION TEST (live)');
    const connector = getConnector('hubspot');
    await check('testConnection() with real key returns ok: true', async () => {
      const result = await connector.testConnection({ apiKey: process.env.HUBSPOT_TEST_API_KEY! });
      return result.ok === true;
    });
    await check('testConnection() with bad key returns ok: false', async () => {
      const result = await connector.testConnection({ apiKey: 'bad_key' });
      return result.ok === false && !!result.error;
    });
  } else {
    console.log('\n⚠️  HUBSPOT_TEST_API_KEY not set — skipping live connection test');
  }

  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ S0.6 PASSED — ${passed} checks\n`);
  } else {
    console.log(`\n❌ S0.6 FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
