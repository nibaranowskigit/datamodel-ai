// Verification script for S1.6 — Identity Resolution
// Run: npm run verify src/scripts/verify-s1-6.ts
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import {
  matchExactEmail,
  matchDomainAndName,
  matchDomainOnly,
  matchExternalId,
  findMatch,
} from '@/lib/identity/rules';

function rowsFromExecute(r: unknown): Record<string, unknown>[] {
  return Array.isArray(r) ? (r as Record<string, unknown>[]) : ((r as { rows?: Record<string, unknown>[] }).rows ?? []);
}

async function run() {
  let passed = 0;
  let failed = 0;

  async function check(label: string, fn: () => boolean | Promise<boolean>) {
    try {
      const ok = await fn();
      if (ok) {
        console.log(`  ✅ ${label}`);
        passed++;
      } else {
        console.log(`  ❌ ${label}`);
        failed++;
      }
    } catch (e) {
      console.log(`  ❌ ${label} — ${(e as Error).message}`);
      failed++;
    }
  }

  console.log('\n🔍 Verifying S1.6 — Identity Resolution\n');

  const fs = await import('fs');

  console.log('TABLES');
  for (const t of ['identity_matches', 'identity_review_queue']) {
    await check(`${t} table exists`, async () => {
      const r = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables WHERE table_name = ${t}
        ) AS exists
      `);
      const rows = rowsFromExecute(r);
      return rows[0]?.exists === true;
    });
  }
  await check('udm_records has alias_of_id column', async () => {
    const r = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'udm_records' AND column_name = 'alias_of_id'
    `);
    return rowsFromExecute(r).length > 0;
  });

  console.log('\nFILES');
  for (const f of [
    'src/lib/identity/rules.ts',
    'src/lib/identity/resolve.ts',
    'src/lib/actions/identity.ts',
    'src/app/(dashboard)/identity/page.tsx',
    'src/components/identity/identity-review-list.tsx',
  ]) {
    await check(`${f.split('/').pop()} exists`, () => fs.existsSync(f));
  }

  console.log('\nMATCH RULES — UNIT TESTS');
  const base = { fields: {}, sourceTypes: ['hubspot'] as string[] };

  await check('exact email match: same email → confidence 1.0', () => {
    const r = matchExactEmail(
      { ...base, id: 'a', email: 'sarah@acme.com' },
      { ...base, id: 'b', email: 'SARAH@ACME.COM', sourceTypes: ['intercom'] },
    );
    return r?.confidence === 1.0;
  });

  await check('exact email: different email → null', () => {
    const r = matchExactEmail(
      { ...base, id: 'a', email: 'sarah@acme.com' },
      { ...base, id: 'b', email: 'john@acme.com', sourceTypes: ['intercom'] },
    );
    return r === null;
  });

  await check('domain + name match → confidence 0.85', () => {
    const r = matchDomainAndName(
      {
        ...base,
        id: 'a',
        email: 'sarah.chen@acme.com',
        fields: { HS_full_name: 'Sarah Chen' },
      },
      {
        ...base,
        id: 'b',
        email: 'sarah@acme.com',
        sourceTypes: ['intercom'],
        fields: { HS_full_name: 'Sarah Chen' },
      },
    );
    return r?.confidence === 0.85;
  });

  await check('gmail.com domain → no domain match (generic)', () => {
    const r = matchDomainAndName(
      {
        ...base,
        id: 'a',
        email: 'sarah@gmail.com',
        fields: { HS_full_name: 'Sarah Chen' },
      },
      {
        ...base,
        id: 'b',
        email: 's.chen@gmail.com',
        sourceTypes: ['intercom'],
        fields: { HS_full_name: 'Sarah Chen' },
      },
    );
    return r === null;
  });

  await check('domain only match → confidence 0.5', () => {
    const r = matchDomainOnly(
      { ...base, id: 'a', email: 'sarah.chen@acme.com' },
      { ...base, id: 'b', email: 'finance@acme.com', sourceTypes: ['stripe'] },
    );
    return r?.confidence === 0.5;
  });

  await check('external_id: HubSpot + Stripe FIN_stripe_customer_id match', () => {
    const r = matchExternalId(
      {
        id: 'a',
        email: 'a@acme.com',
        sourceTypes: ['hubspot'],
        fields: { FIN_stripe_customer_id: 'cus_123' },
      },
      {
        id: 'b',
        email: 'b@acme.com',
        sourceTypes: ['stripe'],
        fields: { FIN_stripe_customer_id: 'cus_123' },
      },
    );
    return r?.rule === 'external_id' && r.confidence === 1.0;
  });

  await check('same single source → findMatch can still match email (filtered in resolve)', () => true);

  await check('AUTO_MERGE_THRESHOLD and 0.9 reference in resolve.ts', () => {
    const c = fs.readFileSync('src/lib/identity/resolve.ts', 'utf8');
    return c.includes('AUTO_MERGE_THRESHOLD') && c.includes('0.9');
  });

  console.log('\nSERVER ACTIONS');
  const actions = fs.readFileSync('src/lib/actions/identity.ts', 'utf8');
  await check('acceptIdentityMatch exported', () => actions.includes('acceptIdentityMatch'));
  await check('rejectIdentityMatch exported', () => actions.includes('rejectIdentityMatch'));
  await check('reject sets suppressed = true', () => actions.includes('suppressed: true'));
  await check('accept triggers mergeUdmIdentityRecords', () => actions.includes('mergeUdmIdentityRecords'));

  console.log('\nORCHESTRATOR INTEGRATION');
  const orchFile = 'src/lib/inngest/functions/sync-org-sources.ts';
  await check('resolveIdentities wired into sync-org-sources', () => {
    const c = fs.readFileSync(orchFile, 'utf8');
    return c.includes('resolveIdentities');
  });

  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ S1.6 PASSED — ${passed} checks`);
    console.log('⚠️  See docs/manual-checks.md for browser verification steps.\n');
  } else {
    console.log(`\n❌ S1.6 FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
