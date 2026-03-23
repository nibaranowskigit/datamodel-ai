// src/scripts/verify-notif3.ts
// Run: npm run verify src/scripts/verify-notif3.ts
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

  console.log('\n🔍 Verifying NOTIF.3 — Field Approval Needed\n');

  const fs = await import('fs');

  console.log('FILES');
  await check('notify-field-approval.ts exists', () =>
    fs.existsSync('src/lib/notifications/notify-field-approval.ts')
  );

  console.log('\nHELPER');
  const helper = fs.readFileSync(
    'src/lib/notifications/notify-field-approval.ts', 'utf8'
  );
  await check('guards fieldCount === 0', () =>
    helper.includes('fieldCount === 0') || helper.includes('fieldCount > 0')
  );
  await check('calls notify() with field_approval type', () =>
    helper.includes("'field_approval'") || helper.includes('"field_approval"')
  );
  await check('fetches org members from Clerk', () =>
    helper.includes('getOrganizationMembershipList')
  );
  await check('has dedup guard', () =>
    helper.includes('alreadyNotified')
  );
  await check('title includes fieldCount and sourceName', () =>
    helper.includes('fieldCount') && helper.includes('sourceName') && helper.includes('title')
  );
  await check('CTA links to /fields', () =>
    helper.includes('/fields')
  );

  console.log('\nINNGEST INTEGRATION');
  const proposalFiles = [
    'src/inngest/functions/propose-fields.ts',
    'src/lib/inngest/functions/propose-fields.ts',
  ];
  const proposalFile = proposalFiles.find((f) => fs.existsSync(f));
  await check('propose-fields.ts exists', () => !!proposalFile);
  if (proposalFile) {
    await check('calls notifyFieldApprovalNeeded', () => {
      const c = fs.readFileSync(proposalFile, 'utf8');
      return c.includes('notifyFieldApprovalNeeded');
    });
    await check('wrapped in step.run', () => {
      const c = fs.readFileSync(proposalFile, 'utf8');
      return c.includes('step.run') && c.includes('notifyFieldApprovalNeeded');
    });
  }

  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ NOTIF.3 PASSED — ${passed} checks`);
    console.log('⚠️  See docs/manual-checks.md for browser verification steps.\n');
  } else {
    console.log(`\n❌ NOTIF.3 FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
