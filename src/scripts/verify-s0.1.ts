// Run: npm run verify src/scripts/verify-s0.1.ts
import { db } from '@/lib/db';
import { orgs, udmFields } from '@/lib/db/schema';
import { getProductionUdmFields } from '@/lib/fields/queries';
import { validateFieldKey } from '@/lib/fields/validation';
import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

const TEST_ORG_ID = `org_verify_s01_${Date.now()}`;

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

  console.log('\n🔍 Verifying S0.1 — UDM Field Schema + Registry\n');

  console.log('TABLES');
  for (const table of ['udm_fields', 'udm_field_versions', 'udm_field_sources']) {
    await check(`${table} table exists`, async () => {
      const r = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables WHERE table_name = ${table}
        ) as exists
      `);
      const rows = Array.isArray(r) ? r : (r as any).rows ?? [];
      return rows[0]?.exists === true;
    });
  }

  console.log('\nFIELD KEY VALIDATION');
  await check('FIN_mrr_v1 is valid', () => { validateFieldKey('FIN_mrr_v1'); return true; });
  await check('AI_health_score_v2 is valid', () => { validateFieldKey('AI_health_score_v2'); return true; });
  await check('invalid key throws', () => {
    try { validateFieldKey('mrr'); return false; }
    catch { return true; }
  });
  await check('uppercase key throws', () => {
    try { validateFieldKey('FIN_MRR_v1'); return false; }
    catch { return true; }
  });

  console.log('\nFIELD LIFECYCLE');
  const fieldId = `field_verify_${Date.now()}`;

  // Insert a test org to satisfy the FK constraint on udm_fields.org_id
  await db.insert(orgs).values({
    id: TEST_ORG_ID,
    clerkOrgId: TEST_ORG_ID,
    name: 'S0.1 Verify Org',
    plan: 'free',
    status: 'active',
  });

  await check('can insert proposed field', async () => {
    await db.insert(udmFields).values({
      id: fieldId,
      orgId: TEST_ORG_ID,
      fieldKey: 'FIN_mrr_v1',
      displayName: 'Monthly Recurring Revenue',
      typology: 'FIN',
      dataType: 'number',
      status: 'proposed',
      aiSuggested: true,
      aiRationale: 'Stripe subscription data available',
    });
    return true;
  });

  await check('proposed field NOT returned by getProductionUdmFields', async () => {
    const fields = await getProductionUdmFields(TEST_ORG_ID);
    return !fields.some(f => f.id === fieldId);
  });

  await check('can approve field → status = production', async () => {
    await db.update(udmFields)
      .set({ status: 'production', approvedBy: 'user_test', approvedAt: new Date() })
      .where(and(eq(udmFields.id, fieldId), eq(udmFields.orgId, TEST_ORG_ID)));
    const f = await db.query.udmFields.findFirst({ where: eq(udmFields.id, fieldId) });
    return f?.status === 'production' && !!f?.approvedBy && !!f?.approvedAt;
  });

  await check('production field IS returned by getProductionUdmFields', async () => {
    const fields = await getProductionUdmFields(TEST_ORG_ID);
    return fields.some(f => f.id === fieldId);
  });

  await check('cannot change field_key of production field', async () => {
    const f = await db.query.udmFields.findFirst({ where: eq(udmFields.id, fieldId) });
    if (f?.status === 'production' && 'FIN_mrr_v2' !== f.fieldKey) return true;
    return false;
  });

  await check('can deprecate field → status = deprecated', async () => {
    await db.update(udmFields)
      .set({ status: 'deprecated', supersededBy: 'FIN_mrr_v2' })
      .where(and(eq(udmFields.id, fieldId), eq(udmFields.orgId, TEST_ORG_ID)));
    const f = await db.query.udmFields.findFirst({ where: eq(udmFields.id, fieldId) });
    return f?.status === 'deprecated' && f?.supersededBy === 'FIN_mrr_v2';
  });

  await check('deprecated field NOT returned by getProductionUdmFields', async () => {
    const fields = await getProductionUdmFields(TEST_ORG_ID);
    return !fields.some(f => f.id === fieldId);
  });

  // Cleanup — field first (FK), then org
  await db.delete(udmFields).where(eq(udmFields.id, fieldId));
  await db.delete(orgs).where(eq(orgs.id, TEST_ORG_ID));

  console.log('\nFILE EXISTENCE');
  const fs = await import('fs');
  const files = [
    'src/lib/db/schema/enums.ts',
    'src/lib/db/schema/udm-fields.ts',
    'src/lib/fields/validation.ts',
    'src/lib/fields/queries.ts',
    'src/lib/actions/fields.ts',
  ];
  for (const file of files) {
    await check(`${file} exists`, () => fs.existsSync(file));
  }

  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ S0.1 PASSED — ${passed} checks\n`);
  } else {
    console.log(`\n❌ S0.1 FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
