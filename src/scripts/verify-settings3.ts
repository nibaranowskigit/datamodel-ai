// Run: npm run verify src/scripts/verify-settings3.ts
import { db } from '@/lib/db';

async function run() {
  let passed = 0;
  let failed = 0;

  async function check(label: string, fn: () => boolean | Promise<boolean>) {
    try {
      const ok = await fn();
      if (ok) { console.log(`  ✅ ${label}`); passed++; }
      else    { console.log(`  ❌ ${label}`); failed++; }
    } catch (e) {
      console.log(`  ❌ ${label} — ${(e as Error).message}`);
      failed++;
    }
  }

  console.log('\n🔍 Verifying SETTINGS.3 — Connected Sources\n');

  const fs = await import('fs');

  console.log('FILES');
  const files = [
    'src/lib/connectors/source-fields.ts',
    'src/components/settings/sources-list.tsx',
    'src/app/(dashboard)/settings/sources/page.tsx',
  ];
  for (const f of files) {
    await check(`${f.split('/').pop()} exists`, () => fs.existsSync(f));
  }

  console.log('\nSERVER ACTIONS');
  await check('reconnectSource exported from sources.ts', () => {
    const c = fs.readFileSync('src/lib/actions/sources.ts', 'utf8');
    return c.includes('reconnectSource');
  });
  await check('reconnectSource has requireRole org:admin', () => {
    const c = fs.readFileSync('src/lib/actions/sources.ts', 'utf8');
    return c.includes('reconnectSource') && c.includes("requireRole('org:admin')");
  });
  await check('reconnectSource encrypts config', () => {
    const c = fs.readFileSync('src/lib/actions/sources.ts', 'utf8');
    return c.includes('encrypt');
  });
  await check("reconnectSource resets status to pending", () => {
    const c = fs.readFileSync('src/lib/actions/sources.ts', 'utf8');
    return c.includes("status: 'pending'");
  });
  await check('reconnectSource clears lastSyncError', () => {
    const c = fs.readFileSync('src/lib/actions/sources.ts', 'utf8');
    return c.includes('lastSyncError: null');
  });

  console.log('\nCOMPONENT');
  await check('sources-list has empty state', () => {
    const c = fs.readFileSync('src/components/settings/sources-list.tsx', 'utf8');
    return c.includes('length === 0') || c.includes('No sources');
  });
  await check('sources-list has two-step disconnect confirm', () => {
    const c = fs.readFileSync('src/components/settings/sources-list.tsx', 'utf8');
    return c.includes('confirmDisconnect') && c.includes('Sure');
  });
  await check('sources-list never exposes connectionConfig', () => {
    const c = fs.readFileSync('src/components/settings/sources-list.tsx', 'utf8');
    return !c.includes('connectionConfig');
  });
  await check('sources-list shows timeAgo for last sync', () => {
    const c = fs.readFileSync('src/components/settings/sources-list.tsx', 'utf8');
    return c.includes('timeAgo') || c.includes('Last sync');
  });

  console.log('\nSOURCE FIELDS');
  await check('source-fields.ts exports getSourceFields', () => {
    const c = fs.readFileSync('src/lib/connectors/source-fields.ts', 'utf8');
    return c.includes('getSourceFields');
  });
  await check('source-fields.ts exports SOURCE_META', () => {
    const c = fs.readFileSync('src/lib/connectors/source-fields.ts', 'utf8');
    return c.includes('SOURCE_META');
  });
  await check('SOURCE_META covers hubspot, stripe, intercom, mixpanel', () => {
    const c = fs.readFileSync('src/lib/connectors/source-fields.ts', 'utf8');
    return ['hubspot', 'stripe', 'intercom', 'mixpanel'].every((s) => c.includes(s));
  });

  console.log('\nPAGE');
  await check('sources page excludes connectionConfig', () => {
    const c = fs.readFileSync('src/app/(dashboard)/settings/sources/page.tsx', 'utf8');
    return c.includes('connectionConfig: false');
  });
  await check('sources page uses hasRole for isAdmin', () => {
    const c = fs.readFileSync('src/app/(dashboard)/settings/sources/page.tsx', 'utf8');
    return c.includes('hasRole') && c.includes('isAdmin');
  });
  await check('sources page passes isAdmin to SourcesList', () => {
    const c = fs.readFileSync('src/app/(dashboard)/settings/sources/page.tsx', 'utf8');
    return c.includes('isAdmin={isAdmin}');
  });

  console.log('\nDB');
  const { sql } = await import('drizzle-orm');
  await check('data_sources table exists', async () => {
    const r = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables WHERE table_name = 'data_sources'
      ) as "exists"
    `);
    const rows = Array.isArray(r) ? r : (r as unknown as { rows: unknown[] }).rows ?? [];
    const val = (rows[0] as Record<string, unknown>)?.exists;
    return val === true || val === 'true' || val === 't';
  });

  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ SETTINGS.3 PASSED — ${passed} checks`);
    console.log('⚠️  See docs/manual-checks.md for browser verification steps.\n');
  } else {
    console.log(`\n❌ SETTINGS.3 FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
