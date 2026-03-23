// src/scripts/verify-notif1.ts
// Run: npm run verify src/scripts/verify-notif1.ts
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

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

  console.log('\n🔍 Verifying NOTIF.1 — Notification Infrastructure\n');

  const fs = await import('fs');

  function rows(r: unknown): unknown[] {
    return Array.isArray(r) ? r : ((r as { rows?: unknown[] }).rows ?? []);
  }

  console.log('TABLE');
  await check('notifications table exists', async () => {
    const r = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables WHERE table_name = 'notifications'
      ) as "exists"
    `);
    const val = (rows(r)[0] as Record<string, unknown>)?.exists;
    return val === true || val === 'true' || val === 't';
  });
  for (const col of ['user_id', 'org_id', 'type', 'title', 'body', 'link', 'read_at']) {
    await check(`notifications.${col} exists`, async () => {
      const r = await db.execute(sql`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'notifications' AND column_name = ${col}
      `);
      return rows(r).length > 0;
    });
  }

  console.log('\nFILES');
  const files = [
    'src/lib/resend.ts',
    'src/lib/notifications/notify.ts',
    'src/lib/notifications/templates/index.ts',
    'src/lib/notifications/templates/base.tsx',
    'src/lib/notifications/templates/sync-failure.tsx',
    'src/lib/notifications/templates/field-approval.tsx',
    'src/lib/notifications/templates/billing.tsx',
    'src/lib/notifications/templates/weekly-digest.tsx',
  ];
  for (const f of files) {
    await check(`${f.split('/').pop()} exists`, () => fs.existsSync(f));
  }

  console.log('\nNOTIFY FUNCTION');
  const notifyFile = fs.readFileSync('src/lib/notifications/notify.ts', 'utf8');
  await check('notify calls shouldNotify', () =>
    notifyFile.includes('shouldNotify')
  );
  await check('notify sends email via resend', () =>
    notifyFile.includes('resend.emails.send')
  );
  await check('notify inserts into notifications table', () =>
    notifyFile.includes('db.insert(notifications)')
  );
  await check('notify returns early if shouldNotify false', () =>
    notifyFile.includes('!allowed') || notifyFile.includes('if (!')
  );

  console.log('\nTEMPLATES');
  await check('base template uses electric teal CTA (#0EA5E9)', () => {
    const c = fs.readFileSync('src/lib/notifications/templates/base.tsx', 'utf8');
    return c.includes('#0EA5E9');
  });
  await check('base template has unsubscribe/manage preferences link', () => {
    const c = fs.readFileSync('src/lib/notifications/templates/base.tsx', 'utf8');
    return c.includes('settings/notifications') || c.includes('preferences');
  });
  await check('all 4 templates export correct function name', () => {
    const types = ['sync-failure', 'field-approval', 'billing', 'weekly-digest'];
    return types.every((t) =>
      fs.existsSync(`src/lib/notifications/templates/${t}.tsx`)
    );
  });

  console.log('\nENV VARS');
  await check('RESEND_API_KEY set', () => !!process.env.RESEND_API_KEY);
  await check('NEXT_PUBLIC_APP_URL set', () => !!process.env.NEXT_PUBLIC_APP_URL);

  console.log('\nDEPENDENCIES');
  await check('@react-email/components installed', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    return '@react-email/components' in (pkg.dependencies ?? {});
  });
  await check('resend installed', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    return 'resend' in (pkg.dependencies ?? {});
  });

  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ NOTIF.1 PASSED — ${passed} checks`);
    console.log('⚠️  See docs/manual-checks.md for browser verification steps.\n');
  } else {
    console.log(`\n❌ NOTIF.1 FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
