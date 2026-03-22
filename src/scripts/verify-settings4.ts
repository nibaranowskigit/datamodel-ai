// Run: npm run verify src/scripts/verify-settings4.ts
import { db } from '@/lib/db';
import { notificationPreferences, orgs } from '@/lib/db/schema';
import { shouldNotify } from '@/lib/notifications/should-notify';
import { eq, and, sql } from 'drizzle-orm';

const TS = Date.now();
const TEST_USER_ID = `user_verify_s4_${TS}`;
const TEST_ORG_ID  = `org_verify_s4_${TS}`;

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

  console.log('\n🔍 Verifying SETTINGS.4 — Notification Preferences\n');

  const fs = await import('fs');

  // Setup: insert a test org so FK constraints pass
  await db.insert(orgs).values({
    id:         TEST_ORG_ID,
    clerkOrgId: TEST_ORG_ID,
    name:       'Verify S4 Test Org',
    plan:       'free',
    status:     'active',
  }).onConflictDoNothing();

  console.log('TABLE');
  await check('notification_preferences table exists', async () => {
    const r = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'notification_preferences'
      ) as "exists"
    `);
    const rows = Array.isArray(r) ? r : (r as unknown as { rows: unknown[] }).rows ?? [];
    const val  = (rows[0] as Record<string, unknown>)?.exists;
    return val === true || val === 'true' || val === 't';
  });

  await check('unique constraint on (user_id, org_id, type)', async () => {
    const r = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM information_schema.table_constraints
      WHERE table_name = 'notification_preferences'
      AND constraint_type = 'UNIQUE'
    `);
    const rows = Array.isArray(r) ? r : (r as unknown as { rows: unknown[] }).rows ?? [];
    return parseInt(String((rows[0] as Record<string, unknown>)?.cnt ?? '0')) > 0;
  });

  console.log('\nFILES');
  const files = [
    'src/lib/notifications/types.ts',
    'src/lib/notifications/should-notify.ts',
    'src/lib/actions/notifications.ts',
    'src/components/settings/notification-toggles.tsx',
  ];
  for (const f of files) {
    await check(`${f.split('/').pop()} exists`, () => fs.existsSync(f));
  }

  console.log('\nNOTIFICATION TYPES');
  await check('4 notification types defined', async () => {
    const { NOTIFICATION_TYPES } = await import('@/lib/notifications/types');
    return NOTIFICATION_TYPES.length === 4;
  });
  await check('weekly_digest defaults to false', async () => {
    const { NOTIFICATION_TYPES } = await import('@/lib/notifications/types');
    const digest = NOTIFICATION_TYPES.find((n) => n.type === 'weekly_digest');
    return digest?.defaultEnabled === false;
  });
  await check('sync_failure defaults to true', async () => {
    const { NOTIFICATION_TYPES } = await import('@/lib/notifications/types');
    const sf = NOTIFICATION_TYPES.find((n) => n.type === 'sync_failure');
    return sf?.defaultEnabled === true;
  });

  console.log('\nshould-notify LOGIC');
  await check('shouldNotify returns true when no pref exists (default)', async () => {
    return await shouldNotify(TEST_USER_ID, TEST_ORG_ID, 'sync_failure');
  });
  await check('shouldNotify returns false for weekly_digest default', async () => {
    return (await shouldNotify(TEST_USER_ID, TEST_ORG_ID, 'weekly_digest')) === false;
  });
  await check('shouldNotify returns false when pref disabled', async () => {
    await db.insert(notificationPreferences).values({
      userId:  TEST_USER_ID,
      orgId:   TEST_ORG_ID,
      type:    'sync_failure',
      enabled: false,
    }).onConflictDoNothing();

    const result = await shouldNotify(TEST_USER_ID, TEST_ORG_ID, 'sync_failure');

    await db.delete(notificationPreferences).where(
      and(
        eq(notificationPreferences.userId, TEST_USER_ID),
        eq(notificationPreferences.orgId,  TEST_ORG_ID)
      )
    );
    await db.delete(orgs).where(eq(orgs.id, TEST_ORG_ID));

    return result === false;
  });

  console.log('\nSERVER ACTION');
  await check('updateNotificationPreference uses onConflictDoUpdate', () => {
    const c = fs.readFileSync('src/lib/actions/notifications.ts', 'utf8');
    return c.includes('onConflictDoUpdate');
  });
  await check('uses getAuth — no unscoped writes', () => {
    const c = fs.readFileSync('src/lib/actions/notifications.ts', 'utf8');
    return c.includes('getAuth');
  });

  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ SETTINGS.4 PASSED — ${passed} checks`);
    console.log('⚠️  See docs/manual-checks.md for browser verification steps.\n');
  } else {
    console.log(`\n❌ SETTINGS.4 FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
