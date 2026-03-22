// src/scripts/verify-user4.ts
// Run: npx tsx src/scripts/verify-user4.ts
export {};

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

  console.log('\n🔍 Verifying USER.4 — Pending Invites Management\n');

  const fs = await import('fs');

  console.log('FILE EXISTENCE');
  await check('pending-invites.tsx exists', () =>
    fs.existsSync('src/components/team/pending-invites.tsx'),
  );

  console.log('\nCOMPONENT FEATURES');
  await check('has empty state', () => {
    const c = fs.readFileSync('src/components/team/pending-invites.tsx', 'utf8');
    return c.includes('length === 0') || c.includes('.length === 0');
  });
  await check('has expiry detection', () => {
    const c = fs.readFileSync('src/components/team/pending-invites.tsx', 'utf8');
    return c.includes('isExpired') || c.includes('expired') || c.includes('Expired');
  });
  await check('has two-step revoke confirmation', () => {
    const c = fs.readFileSync('src/components/team/pending-invites.tsx', 'utf8');
    return (
      (c.includes('confirmId') || c.includes('confirm')) &&
      (c.includes('Sure') || c.includes('sure'))
    );
  });
  await check('has resend success feedback', () => {
    const c = fs.readFileSync('src/components/team/pending-invites.tsx', 'utf8');
    return c.includes('successId') || c.includes('resent') || c.includes('Resent');
  });
  await check('uses RoleBadge', () => {
    const c = fs.readFileSync('src/components/team/pending-invites.tsx', 'utf8');
    return c.includes('RoleBadge');
  });
  await check('Admin-only gate on action buttons', () => {
    const c = fs.readFileSync('src/components/team/pending-invites.tsx', 'utf8');
    return c.includes('isAdmin');
  });
  await check('is a client component', () => {
    const c = fs.readFileSync('src/components/team/pending-invites.tsx', 'utf8');
    return c.includes("'use client'") || c.includes('"use client"');
  });
  await check('optimistic removal on revoke', () => {
    const c = fs.readFileSync('src/components/team/pending-invites.tsx', 'utf8');
    return c.includes('localInvites') || c.includes('filter');
  });
  await check('INVITE_TTL_DAYS constant used', () => {
    const c = fs.readFileSync('src/components/team/pending-invites.tsx', 'utf8');
    return c.includes('INVITE_TTL_DAYS');
  });

  console.log('\nSERVER ACTIONS');
  await check('revokeInvite exists in team.ts', () => {
    const c = fs.readFileSync('src/lib/actions/team.ts', 'utf8');
    return c.includes('revokeInvite');
  });
  await check('resendInvite exists in team.ts', () => {
    const c = fs.readFileSync('src/lib/actions/team.ts', 'utf8');
    return c.includes('resendInvite');
  });
  await check('revalidatePath called in revokeInvite', () => {
    const c = fs.readFileSync('src/lib/actions/team.ts', 'utf8');
    return c.includes('revalidatePath');
  });

  console.log('\nBADGE VARIANTS');
  await check('badge.tsx has warning variant', () => {
    const c = fs.readFileSync('src/components/ui/badge.tsx', 'utf8');
    return c.includes('warning');
  });

  console.log('\nTEAM PAGE INTEGRATION');
  await check('team page passes isAdmin to PendingInvites', () => {
    const c = fs.readFileSync(
      'src/app/(dashboard)/settings/team/page.tsx',
      'utf8',
    );
    return c.includes('isAdmin={isAdmin}') && c.includes('PendingInvites');
  });

  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ USER.4 PASSED — ${passed} checks`);
    console.log('⚠️  Manually test:');
    console.log('    - Resend → success feedback appears for 3s');
    console.log('    - Revoke → two-step confirm → invite removed immediately');
    console.log('    - Click "No" → nothing changes');
    console.log('    - No pending invites → empty state shown');
    console.log('    - Expired invite → Expired badge visible');
    console.log('    - Non-Admin → pending invites section hidden\n');
  } else {
    console.log(`\n❌ USER.4 FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
