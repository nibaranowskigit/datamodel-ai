// src/scripts/verify-notif5.ts
// Run: npm run verify src/scripts/verify-notif5.ts

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

  console.log('\n🔍 Verifying NOTIF.5 — Weekly Digest\n');

  const fs = await import('fs');

  console.log('FILES');
  const files = [
    'src/lib/notifications/digest/build-digest.ts',
    'src/lib/inngest/functions/weekly-digest.ts',
  ];
  for (const f of files) {
    await check(`${f.split('/').pop()} exists`, () => fs.existsSync(f));
  }

  console.log('\nDIGEST BUILDER');
  const builder = fs.readFileSync(
    'src/lib/notifications/digest/build-digest.ts', 'utf8'
  );
  await check('queries syncLogs', () => builder.includes('syncLogs'));
  await check('queries udmFields (proposed fields)', () => builder.includes('udmFields'));
  await check('has hasActivity flag', () => builder.includes('hasActivity'));
  await check('covers 7-day window', () =>
    builder.includes('weekStart') && builder.includes('weekEnd')
  );
  await check('uses error status (not failed)', () => builder.includes("'error'"));

  console.log('\nCRON FUNCTION');
  const cron = fs.readFileSync(
    'src/lib/inngest/functions/weekly-digest.ts', 'utf8'
  );
  await check('cron expression: every Sunday 8am UTC', () =>
    cron.includes('0 8 * * 0')
  );
  await check('skips orgs with no activity', () =>
    cron.includes('hasActivity')
  );
  await check('calls notify() with weekly_digest type', () =>
    cron.includes("'weekly_digest'") || cron.includes('"weekly_digest"')
  );
  await check('uses clerkOrgId for Clerk API', () =>
    cron.includes('clerkOrgId')
  );
  await check('registered in src/app/api/inngest/route.ts', () => {
    const route = fs.readFileSync('src/app/api/inngest/route.ts', 'utf8');
    return route.includes('weeklyDigest');
  });

  console.log('\nTEMPLATE');
  await check('weekly-digest.tsx has been updated from stub', () => {
    const c = fs.readFileSync(
      'src/lib/notifications/templates/weekly-digest.tsx', 'utf8'
    );
    return c.includes('DigestData') && c.includes('syncs');
  });
  await check('template handles missing digest gracefully', () => {
    const c = fs.readFileSync(
      'src/lib/notifications/templates/weekly-digest.tsx', 'utf8'
    );
    return c.includes('if (!digest)');
  });
  await check('template omits health section when score is null', () => {
    const c = fs.readFileSync(
      'src/lib/notifications/templates/weekly-digest.tsx', 'utf8'
    );
    return c.includes('currentScore !== null');
  });

  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ NOTIF.5 PASSED — ${passed} checks`);
    console.log('⚠️  See docs/manual-checks.md for browser verification steps.\n');
  } else {
    console.log(`\n❌ NOTIF.5 FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
