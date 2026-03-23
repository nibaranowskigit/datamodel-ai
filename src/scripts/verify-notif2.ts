// src/scripts/verify-notif2.ts
// Run: npm run verify src/scripts/verify-notif2.ts
export {};

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

  console.log('\n🔍 Verifying NOTIF.2 — Sync Failure Alerts\n');

  const fs = await import('fs');

  console.log('FILES');
  await check('notify-sync-failure.ts exists', () =>
    fs.existsSync('src/lib/notifications/notify-sync-failure.ts')
  );

  console.log('\nNOTIFY HELPER');
  const helper = fs.readFileSync(
    'src/lib/notifications/notify-sync-failure.ts', 'utf8'
  );
  await check('fetches org members from Clerk', () =>
    helper.includes('getOrganizationMembershipList')
  );
  await check('calls notify() for each member', () =>
    helper.includes('notify(') && helper.includes('sync_failure')
  );
  await check('includes source name in title', () =>
    helper.includes('sourceName') && helper.includes('title')
  );
  await check('includes error message in body', () =>
    helper.includes('errorMessage') && helper.includes('body')
  );
  await check('links to /settings/sources', () =>
    helper.includes('settings/sources')
  );
  await check('has dedup guard', () =>
    helper.includes('alreadyNotified') || helper.includes('dedup') || helper.includes('5 *')
  );

  console.log('\nSYNC FUNCTION INTEGRATION');
  const syncFiles = [
    'src/inngest/functions/sync-source.ts',
    'src/lib/inngest/functions/sync-source.ts',
  ];
  const syncFile = syncFiles.find((f) => fs.existsSync(f));
  await check('sync function file exists', () => !!syncFile);
  if (syncFile) {
    await check('sync function calls notifySyncFailure', () => {
      const c = fs.readFileSync(syncFile, 'utf8');
      return c.includes('notifySyncFailure');
    });
    await check('notifySyncFailure called inside catch block', () => {
      const c = fs.readFileSync(syncFile, 'utf8');
      const catchIdx = c.indexOf('catch (');
      // Find the call-site occurrence (after the import line)
      const firstNotifIdx = c.indexOf('notifySyncFailure');
      const callIdx = c.indexOf('notifySyncFailure', firstNotifIdx + 1);
      return catchIdx !== -1 && callIdx > catchIdx;
    });
    await check('notifySyncFailure wrapped in step.run', () => {
      const c = fs.readFileSync(syncFile, 'utf8');
      return c.includes("step.run('notify-sync-failure'") ||
             c.includes('step.run("notify-sync-failure"');
    });
    await check('error is re-thrown after notifying', () => {
      const c = fs.readFileSync(syncFile, 'utf8');
      const notifIdx = c.indexOf('notifySyncFailure');
      const throwIdx = c.indexOf('throw err', notifIdx);
      return throwIdx !== -1;
    });
  }

  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ NOTIF.2 PASSED — ${passed} checks`);
    console.log('⚠️  See docs/manual-checks.md for browser verification steps.\n');
  } else {
    console.log(`\n❌ NOTIF.2 FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
