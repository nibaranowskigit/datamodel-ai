// Run: npm run verify src/scripts/verify-s0.5.ts
import { db } from '@/lib/db';
import { udmRecords, cdmRecords, udmFieldValues, cdmFieldValues, cdmConflicts, orgs } from '@/lib/db/schema';
import { upsertUdmRecord, upsertUdmFieldValue } from '@/lib/records/udm';
import { upsertCdmRecord, upsertCdmFieldValue } from '@/lib/records/cdm';
import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

const TS = Date.now();
const TEST_ORG_B2B = `org_verify_s05_b2b_${TS}`;
const TEST_ORG_B2C = `org_verify_s05_b2c_${TS}`;

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

  console.log('\n🔍 Verifying S0.5 — Record Store\n');

  console.log('TABLES');
  for (const table of ['udm_records', 'cdm_records', 'udm_field_values', 'cdm_field_values', 'cdm_conflicts']) {
    await check(`${table} exists`, async () => {
      const r = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables WHERE table_name = ${table}
        ) as "exists"
      `);
      const rows = Array.isArray(r) ? r : (r as unknown as { rows: unknown[] }).rows ?? [];
      const val = (rows[0] as Record<string, unknown>)?.exists;
      return val === true || val === 'true' || val === 't';
    });
  }

  // Setup test orgs
  await db.insert(orgs).values({
    id: TEST_ORG_B2B,
    clerkOrgId: TEST_ORG_B2B,
    name: 'Test B2B Org',
    businessType: 'b2b',
    plan: 'free',
    status: 'active',
  }).onConflictDoNothing();

  await db.insert(orgs).values({
    id: TEST_ORG_B2C,
    clerkOrgId: TEST_ORG_B2C,
    name: 'Test B2C Org',
    businessType: 'b2c',
    plan: 'free',
    status: 'active',
  }).onConflictDoNothing();

  console.log('\nUDM RECORDS');
  let udmRecordId = '';

  await check('can upsert UDM record', async () => {
    udmRecordId = await upsertUdmRecord({
      orgId: TEST_ORG_B2B,
      externalUserId: 'contact_123',
      email: 'test@acme.com',
      data: { GEN_name_v1: 'Test User' },
    });
    return !!udmRecordId;
  });

  await check('upsert is idempotent — no duplicate', async () => {
    const id2 = await upsertUdmRecord({
      orgId: TEST_ORG_B2B,
      externalUserId: 'contact_123',
      email: 'test@acme.com',
      data: { GEN_name_v1: 'Test User Updated' },
    });
    const records = await db.query.udmRecords.findMany({
      where: and(
        eq(udmRecords.orgId, TEST_ORG_B2B),
        eq(udmRecords.externalUserId, 'contact_123')
      ),
    });
    return records.length === 1 && id2 === udmRecordId;
  });

  await check('can upsert UDM field value', async () => {
    await upsertUdmFieldValue({
      recordId: udmRecordId,
      orgId: TEST_ORG_B2B,
      fieldKey: 'FIN_mrr_v1',
      value: 1200,
      sourceType: 'stripe',
    });
    const fv = await db.query.udmFieldValues.findFirst({
      where: and(
        eq(udmFieldValues.recordId, udmRecordId),
        eq(udmFieldValues.fieldKey, 'FIN_mrr_v1')
      ),
    });
    return (fv?.value as unknown) === 1200;
  });

  await check('field value update saves previous_value', async () => {
    await upsertUdmFieldValue({
      recordId: udmRecordId,
      orgId: TEST_ORG_B2B,
      fieldKey: 'FIN_mrr_v1',
      value: 1400,
      sourceType: 'stripe',
    });
    const fv = await db.query.udmFieldValues.findFirst({
      where: and(
        eq(udmFieldValues.recordId, udmRecordId),
        eq(udmFieldValues.fieldKey, 'FIN_mrr_v1')
      ),
    });
    return (fv?.previousValue as unknown) === 1200 && (fv?.value as unknown) === 1400;
  });

  console.log('\nCDM RECORDS');
  let cdmRecordId = '';

  await check('B2B org can upsert CDM record', async () => {
    cdmRecordId = await upsertCdmRecord({
      orgId: TEST_ORG_B2B,
      externalCompanyId: 'company_456',
      domain: 'acme.com',
      name: 'Acme Corp',
      data: { GEN_company_name_v1: 'Acme Corp' },
    });
    return !!cdmRecordId;
  });

  await check('CDM upsert is idempotent — no duplicate', async () => {
    const id2 = await upsertCdmRecord({
      orgId: TEST_ORG_B2B,
      externalCompanyId: 'company_456',
      domain: 'acme.com',
      name: 'Acme Corp Updated',
      data: { GEN_company_name_v1: 'Acme Corp Updated' },
    });
    const records = await db.query.cdmRecords.findMany({
      where: and(
        eq(cdmRecords.orgId, TEST_ORG_B2B),
        eq(cdmRecords.externalCompanyId, 'company_456')
      ),
    });
    return records.length === 1 && id2 === cdmRecordId;
  });

  await check('B2C org cannot create CDM record', async () => {
    try {
      await upsertCdmRecord({
        orgId: TEST_ORG_B2C,
        externalCompanyId: 'company_789',
        data: {},
      });
      return false;
    } catch (e) {
      return (e as Error).message.includes('B2B');
    }
  });

  await check('CDM conflict created when two sources disagree', async () => {
    await upsertCdmFieldValue({
      recordId: cdmRecordId,
      orgId: TEST_ORG_B2B,
      fieldKey: 'FIN_arr_v1',
      value: 14400,
      sourceType: 'hubspot',
    });
    await upsertCdmFieldValue({
      recordId: cdmRecordId,
      orgId: TEST_ORG_B2B,
      fieldKey: 'FIN_arr_v1',
      value: 16000,
      sourceType: 'stripe',
    });
    const conflict = await db.query.cdmConflicts.findFirst({
      where: and(
        eq(cdmConflicts.recordId, cdmRecordId),
        eq(cdmConflicts.fieldKey, 'FIN_arr_v1')
      ),
    });
    return !!conflict && conflict.sourceA === 'hubspot' && conflict.sourceB === 'stripe';
  });

  // Cleanup
  await db.delete(udmFieldValues).where(eq(udmFieldValues.orgId, TEST_ORG_B2B));
  await db.delete(cdmConflicts).where(eq(cdmConflicts.orgId, TEST_ORG_B2B));
  await db.delete(cdmFieldValues).where(eq(cdmFieldValues.orgId, TEST_ORG_B2B));
  await db.delete(udmRecords).where(eq(udmRecords.orgId, TEST_ORG_B2B));
  await db.delete(cdmRecords).where(eq(cdmRecords.orgId, TEST_ORG_B2B));
  await db.delete(orgs).where(eq(orgs.id, TEST_ORG_B2B));
  await db.delete(orgs).where(eq(orgs.id, TEST_ORG_B2C));

  console.log('\nFILE EXISTENCE');
  const fs = await import('fs');
  const files = [
    'src/lib/db/schema/records.ts',
    'src/lib/records/udm.ts',
    'src/lib/records/cdm.ts',
  ];
  for (const file of files) {
    await check(`${file} exists`, () => fs.existsSync(file));
  }

  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ S0.5 PASSED — ${passed} checks\n`);
  } else {
    console.log(`\n❌ S0.5 FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
