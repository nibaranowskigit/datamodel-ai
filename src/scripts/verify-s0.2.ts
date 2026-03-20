// Run: npm run verify src/scripts/verify-s0.2.ts
import { db } from '@/lib/db';
import { orgs } from '@/lib/db/schema';
import { sql, eq } from 'drizzle-orm';

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

  console.log('\n🔍 Verifying S0.2 — Org Schema + Multi-Tenancy\n');

  console.log('ENV VARS');
  await check('CLERK_WEBHOOK_SECRET is set', () => !!process.env.CLERK_WEBHOOK_SECRET);

  console.log('\nDATABASE');
  await check('orgs table exists', async () => {
    const r = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables WHERE table_name = 'orgs'
      ) as exists
    `);
    const rows = Array.isArray(r) ? r : (r as any).rows ?? [];
    return rows[0]?.exists === true;
  });

  await check('orgs table has correct columns', async () => {
    const r = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'orgs'
      ORDER BY column_name
    `);
    const rows = Array.isArray(r) ? r : (r as any).rows ?? [];
    const cols = rows.map((row: any) => row.column_name);
    const required = ['id', 'name', 'business_type', 'vertical', 'stage', 'plan', 'status', 'clerk_org_id', 'created_at', 'updated_at'];
    return required.every(col => cols.includes(col));
  });

  console.log('\nORG CRUD');
  const testOrgId = `org_test_${Date.now()}`;
  await check('can insert org', async () => {
    await db.insert(orgs).values({
      id: testOrgId,
      clerkOrgId: testOrgId,
      name: 'Test Org',
      plan: 'free',
      status: 'active',
    });
    return true;
  });

  await check('can query org by clerkOrgId', async () => {
    const org = await db.query.orgs.findFirst({
      where: eq(orgs.clerkOrgId, testOrgId),
    });
    return org?.name === 'Test Org';
  });

  await check('can update org', async () => {
    await db.update(orgs).set({ name: 'Updated Org' }).where(eq(orgs.clerkOrgId, testOrgId));
    const org = await db.query.orgs.findFirst({ where: eq(orgs.clerkOrgId, testOrgId) });
    return org?.name === 'Updated Org';
  });

  await check('can soft-delete org (status = inactive)', async () => {
    await db.update(orgs).set({ status: 'inactive' }).where(eq(orgs.clerkOrgId, testOrgId));
    const org = await db.query.orgs.findFirst({ where: eq(orgs.clerkOrgId, testOrgId) });
    return org?.status === 'inactive';
  });

  // Cleanup
  await db.delete(orgs).where(eq(orgs.clerkOrgId, testOrgId));

  console.log('\nAUTH HELPER');
  await check('src/lib/auth.ts exports getOrgId and getAuth', async () => {
    const mod = await import('@/lib/auth');
    return typeof mod.getOrgId === 'function' && typeof mod.getAuth === 'function';
  });

  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ S0.2 PASSED — ${passed} checks\n`);
  } else {
    console.log(`\n❌ S0.2 FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
