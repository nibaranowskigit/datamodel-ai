// Run: npm run verify src/scripts/verify-s1-1.ts
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

  console.log('\n🔍 Verifying S1.1 — Stripe Connector\n');

  const fs = await import('fs');

  console.log('FILES');
  const files = [
    'src/lib/connectors/stripe/index.ts',
    'src/lib/connectors/stripe/fields.ts',
  ];
  for (const f of files) {
    await check(`${f.split('/').pop()} exists`, () => fs.existsSync(f));
  }

  console.log('\nCONNECTOR INTERFACE');
  await check('StripeConnector implements Connector', () => {
    const c = fs.readFileSync('src/lib/connectors/stripe/index.ts', 'utf8');
    return c.includes('implements Connector');
  });
  await check('StripeConnector has testConnection()', () => {
    const c = fs.readFileSync('src/lib/connectors/stripe/index.ts', 'utf8');
    return c.includes('testConnection');
  });
  await check('StripeConnector has sync()', () => {
    const c = fs.readFileSync('src/lib/connectors/stripe/index.ts', 'utf8');
    return c.includes('async sync');
  });
  await check('uses autoPagingEach for pagination', () => {
    const c = fs.readFileSync('src/lib/connectors/stripe/index.ts', 'utf8');
    return c.includes('autoPagingEach');
  });
  await check('per-record try/catch (one bad record does not abort)', () => {
    const c = fs.readFileSync('src/lib/connectors/stripe/index.ts', 'utf8');
    return c.includes('try') && c.includes('catch') && c.includes('errors.push');
  });
  await check('email reconciliation with existing UDM records', () => {
    const c = fs.readFileSync('src/lib/connectors/stripe/index.ts', 'utf8');
    return c.includes('existingByEmail');
  });
  await check('Stripe API version pinned', () => {
    const c = fs.readFileSync('src/lib/connectors/stripe/index.ts', 'utf8');
    return c.includes('apiVersion');
  });

  console.log('\nFIN_ FIELDS');
  await check('defines FIN_mrr', () => {
    const c = fs.readFileSync('src/lib/connectors/stripe/fields.ts', 'utf8');
    return c.includes('FIN_mrr');
  });
  await check('defines FIN_subscription_status', () => {
    const c = fs.readFileSync('src/lib/connectors/stripe/fields.ts', 'utf8');
    return c.includes('FIN_subscription_status');
  });
  await check('defines FIN_plan_name', () => {
    const c = fs.readFileSync('src/lib/connectors/stripe/fields.ts', 'utf8');
    return c.includes('FIN_plan_name');
  });
  await check('defines FIN_last_invoice_amount and FIN_last_invoice_date', () => {
    const c = fs.readFileSync('src/lib/connectors/stripe/fields.ts', 'utf8');
    return c.includes('FIN_last_invoice_amount') && c.includes('FIN_last_invoice_date');
  });
  await check('defines CDM aggregate fields', () => {
    const c = fs.readFileSync('src/lib/connectors/stripe/fields.ts', 'utf8');
    return c.includes('FIN_total_mrr') && c.includes('FIN_active_subscribers');
  });
  await check('MRR calculation handles annual plans (/12)', () => {
    const c = fs.readFileSync('src/lib/connectors/stripe/index.ts', 'utf8');
    return c.includes("interval === 'year'") && c.includes('/ 12');
  });
  await check('customers without email are skipped (not thrown)', () => {
    const c = fs.readFileSync('src/lib/connectors/stripe/index.ts', 'utf8');
    return c.includes('customer.email') && c.includes('return null');
  });

  console.log('\nREGISTRY');
  await check('stripe registered in connector registry', () => {
    const c = fs.readFileSync('src/lib/connectors/registry.ts', 'utf8');
    return (c.includes("'stripe'") || c.includes('"stripe"')) &&
           !c.includes("// ['stripe'");
  });
  await check('stripeConnector exported from stripe/index', () => {
    const c = fs.readFileSync('src/lib/connectors/stripe/index.ts', 'utf8');
    return c.includes('export const stripeConnector');
  });

  console.log('\nSDK');
  await check('stripe npm package installed', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')) as { dependencies?: Record<string, string> };
    return 'stripe' in (pkg.dependencies ?? {});
  });

  console.log('\nDB (post-sync checks — run after first sync)');
  await check('at least one stripe data_source exists', async () => {
    const r = await db.query.dataSources.findFirst({
      where: eq(dataSources.sourceType, 'stripe'),
    });
    return !!r;
  });

  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ S1.1 PASSED — ${passed} checks`);
    console.log('⚠️  See docs/manual-checks.md for browser verification steps.\n');
  } else {
    console.log(`\n❌ S1.1 FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
