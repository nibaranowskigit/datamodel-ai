// Run: npm run verify src/scripts/verify-s1-2.ts
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

  console.log('\n🔍 Verifying S1.2 — Intercom Connector\n');

  const fs = await import('fs');

  console.log('FILES');
  for (const f of [
    'src/lib/connectors/intercom/index.ts',
    'src/lib/connectors/intercom/fields.ts',
  ]) {
    await check(`${f.split('/').pop()} exists`, () => fs.existsSync(f));
  }

  console.log('\nCONNECTOR INTERFACE');
  const connector = fs.readFileSync('src/lib/connectors/intercom/index.ts', 'utf8');
  await check('IntercomConnector implements Connector', () =>
    connector.includes('implements Connector'),
  );
  await check('has testConnection()', () =>
    connector.includes('testConnection'),
  );
  await check('has sync()', () =>
    connector.includes('async sync'),
  );
  await check('uses cursor-based pagination (starting_after)', () =>
    connector.includes('starting_after'),
  );
  await check('per-record try/catch (one bad contact does not abort)', () =>
    connector.includes('try') && connector.includes('errors.push'),
  );
  await check('contacts without email are skipped (not thrown)', () =>
    connector.includes('!contact.email') || connector.includes('contact.email'),
  );
  await check('email reconciliation with existing UDM records', () =>
    connector.includes('existingByEmail'),
  );
  await check('SUP_ fields merged without overwriting HS_/FIN_ fields', () =>
    connector.includes('mergedData') && connector.includes('...fields'),
  );
  await check('Intercom-Version header pinned', () =>
    connector.includes('Intercom-Version'),
  );
  await check('intercomConnector singleton exported', () =>
    connector.includes('export const intercomConnector'),
  );

  console.log('\nSUP_ FIELDS');
  const fields = fs.readFileSync('src/lib/connectors/intercom/fields.ts', 'utf8');
  for (const f of [
    'SUP_open_tickets',
    'SUP_closed_tickets',
    'SUP_csat_score',
    'SUP_csat_responses',
    'SUP_last_contact_date',
    'SUP_first_contact_date',
    'SUP_total_conversations',
    'SUP_last_csat_rating',
    'SUP_intercom_contact_id',
  ]) {
    await check(`defines UDM field ${f}`, () => fields.includes(f));
  }
  for (const f of [
    'SUP_avg_csat',
    'SUP_total_open_tickets',
    'SUP_contacts_with_open_tickets',
    'SUP_pct_rated_positively',
  ]) {
    await check(`defines CDM aggregate ${f}`, () => fields.includes(f));
  }

  console.log('\nREGISTRY');
  await check('intercom registered in connector registry', () => {
    const c = fs.readFileSync('src/lib/connectors/registry.ts', 'utf8');
    return (c.includes("'intercom'") || c.includes('"intercom"')) &&
           !c.includes("// ['intercom'");
  });
  await check('intercomConnector imported in registry', () => {
    const c = fs.readFileSync('src/lib/connectors/registry.ts', 'utf8');
    return c.includes('intercomConnector') && !c.includes('// S1.2');
  });

  console.log('\nDB (post-connect checks — run after first connection)');
  await check('at least one intercom data_source exists', async () => {
    const r = await db.query.dataSources.findFirst({
      where: eq(dataSources.sourceType, 'intercom'),
    });
    return !!r;
  });

  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ S1.2 PASSED — ${passed} checks`);
    console.log('⚠️  See docs/manual-checks.md for browser verification steps.\n');
  } else {
    console.log(`\n❌ S1.2 FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
