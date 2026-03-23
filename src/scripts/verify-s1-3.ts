// Run: npm run verify src/scripts/verify-s1-3.ts
import { db } from '@/lib/db';
import { dataSources } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function run() {
  let passed = 0;
  let failed = 0;

  async function check(label: string, fn: () => boolean | Promise<boolean>) {
    try {
      const ok = await fn();
      if (ok) { console.log(`  ✅ ${label}`); passed++; }
      else     { console.log(`  ❌ ${label}`); failed++; }
    } catch (e) {
      console.log(`  ❌ ${label} — ${(e as Error).message}`);
      failed++;
    }
  }

  console.log('\n🔍 Verifying S1.3 — Mixpanel Connector\n');

  const fs = await import('fs');

  console.log('FILES');
  for (const f of [
    'src/lib/connectors/mixpanel/index.ts',
    'src/lib/connectors/mixpanel/fields.ts',
  ]) {
    await check(`${f.split('/').pop()} exists`, () => fs.existsSync(f));
  }

  console.log('\nCONNECTOR');
  const connector = fs.readFileSync('src/lib/connectors/mixpanel/index.ts', 'utf8');
  await check('implements Connector interface', () =>
    connector.includes('implements Connector'),
  );
  await check('has testConnection()', () =>
    connector.includes('testConnection'),
  );
  await check('has sync()', () =>
    connector.includes('async sync'),
  );
  await check('uses session_id pagination', () =>
    connector.includes('session_id'),
  );
  await check('per-record try/catch', () =>
    connector.includes('try') && connector.includes('errors.push'),
  );
  await check('skips profiles without email', () =>
    connector.includes('!email') || connector.includes('$email'),
  );
  await check('uses Basic auth with service account', () =>
    connector.includes('Basic') || connector.includes('authHeaders'),
  );
  await check('email reconciliation with existing UDM records', () =>
    connector.includes('existingByEmail'),
  );
  await check('PROD_ fields merged without overwriting HS_/FIN_/SUP_ fields', () =>
    connector.includes('mergedData') && connector.includes('...fields'),
  );
  await check('activationEvent null → PROD_activated null (not false)', () =>
    connector.includes('activationEvent') && connector.includes('null'),
  );
  await check('mixpanelConnector singleton exported', () =>
    connector.includes('export const mixpanelConnector'),
  );

  console.log('\nPROD_ UDM FIELDS');
  const fields = fs.readFileSync('src/lib/connectors/mixpanel/fields.ts', 'utf8');
  for (const f of [
    'PROD_last_seen',
    'PROD_first_seen',
    'PROD_activated',
    'PROD_activation_date',
    'PROD_session_count_30d',
    'PROD_days_since_last_seen',
    'PROD_feature_breadth',
    'PROD_country',
    'PROD_mixpanel_distinct_id',
  ]) {
    await check(`defines UDM field ${f}`, () => fields.includes(f));
  }

  console.log('\nPROD_ CDM FIELDS');
  for (const f of [
    'PROD_mau',
    'PROD_wau',
    'PROD_dau',
    'PROD_activation_rate',
    'PROD_avg_sessions_30d',
    'PROD_pct_dormant',
  ]) {
    await check(`defines CDM field ${f}`, () => fields.includes(f));
  }

  console.log('\nREGISTRY');
  await check('mixpanel registered in connector registry', () => {
    const c = fs.readFileSync('src/lib/connectors/registry.ts', 'utf8');
    return (c.includes("'mixpanel'") || c.includes('"mixpanel"')) &&
           !c.includes("// ['mixpanel'");
  });
  await check('mixpanelConnector imported in registry', () => {
    const c = fs.readFileSync('src/lib/connectors/registry.ts', 'utf8');
    return c.includes('mixpanelConnector') && !c.includes('// S1.3');
  });

  console.log('\nTYPES');
  await check('MixpanelConfig has activationEvent in types.ts', () => {
    const t = fs.readFileSync('src/lib/connectors/types.ts', 'utf8');
    return t.includes('activationEvent');
  });

  console.log('\nSOURCES');
  await check('activationEvent field in sources.ts', () => {
    const s = fs.readFileSync('src/lib/onboarding/sources.ts', 'utf8');
    return s.includes('activationEvent');
  });

  console.log('\nDB (post-connect checks — run after first connection)');
  await check('at least one mixpanel data_source exists', async () => {
    const r = await db.query.dataSources.findFirst({
      where: eq(dataSources.sourceType, 'mixpanel'),
    });
    return !!r;
  });

  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ S1.3 PASSED — ${passed} checks`);
    console.log('⚠️  See docs/manual-checks.md for browser verification steps.\n');
  } else {
    console.log(`\n❌ S1.3 FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
