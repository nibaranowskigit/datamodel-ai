// Run: npx tsx src/scripts/verify-user1.ts

import * as fs from 'fs';

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

  console.log('\n🔍 Verifying USER.1 — Invite Team Members\n');

  console.log('FILE EXISTENCE');
  const files = [
    'src/lib/actions/team.ts',
    'src/app/(dashboard)/settings/team/page.tsx',
    'src/components/team/invite-form.tsx',
    'src/components/team/pending-invites.tsx',
  ];
  for (const file of files) {
    await check(`${file} exists`, () => fs.existsSync(file));
  }

  console.log('\nSERVER ACTIONS');
  await check('team.ts has inviteMember', () => {
    const c = fs.readFileSync('src/lib/actions/team.ts', 'utf8');
    return c.includes('inviteMember');
  });
  await check('team.ts has revokeInvite', () => {
    const c = fs.readFileSync('src/lib/actions/team.ts', 'utf8');
    return c.includes('revokeInvite');
  });
  await check('team.ts has resendInvite', () => {
    const c = fs.readFileSync('src/lib/actions/team.ts', 'utf8');
    return c.includes('resendInvite');
  });
  await check('inviteMember has requireRole org:admin guard', () => {
    const c = fs.readFileSync('src/lib/actions/team.ts', 'utf8');
    return (
      c.includes("requireRole('org:admin')") ||
      c.includes('requireRole("org:admin")')
    );
  });
  await check('inviteMember handles duplicate_record error', () => {
    const c = fs.readFileSync('src/lib/actions/team.ts', 'utf8');
    return c.includes('duplicate_record');
  });
  await check('all three actions call revalidatePath', () => {
    const c = fs.readFileSync('src/lib/actions/team.ts', 'utf8');
    return (c.match(/revalidatePath/g) ?? []).length >= 3;
  });
  await check('uses use server directive', () => {
    const c = fs.readFileSync('src/lib/actions/team.ts', 'utf8');
    return c.includes("'use server'") || c.includes('"use server"');
  });

  console.log('\nTEAM PAGE');
  await check('team page guards InviteForm behind isAdmin', () => {
    const c = fs.readFileSync(
      'src/app/(dashboard)/settings/team/page.tsx',
      'utf8',
    );
    return c.includes('isAdmin') && c.includes('{isAdmin && <InviteForm');
  });
  await check('team page fetches pending invitations', () => {
    const c = fs.readFileSync(
      'src/app/(dashboard)/settings/team/page.tsx',
      'utf8',
    );
    return (
      c.includes('getOrganizationInvitationList') &&
      c.includes("status: ['pending']")
    );
  });

  console.log('\nCOMPONENTS');
  await check('invite-form.tsx has email input', () => {
    const c = fs.readFileSync('src/components/team/invite-form.tsx', 'utf8');
    return c.includes('email');
  });
  await check('invite-form.tsx has role selector', () => {
    const c = fs.readFileSync('src/components/team/invite-form.tsx', 'utf8');
    return c.includes('role') && c.includes('Select');
  });
  await check('invite-form.tsx default role is org:member', () => {
    const c = fs.readFileSync('src/components/team/invite-form.tsx', 'utf8');
    return c.includes('org:member') && !c.includes('defaultValue="org:viewer"');
  });
  await check('invite-form.tsx calls inviteMember action', () => {
    const c = fs.readFileSync('src/components/team/invite-form.tsx', 'utf8');
    return c.includes('inviteMember');
  });
  await check('pending-invites.tsx has revoke button', () => {
    const c = fs.readFileSync(
      'src/components/team/pending-invites.tsx',
      'utf8',
    );
    return c.includes('revokeInvite') || c.includes('Revoke');
  });
  await check('pending-invites.tsx has resend button', () => {
    const c = fs.readFileSync(
      'src/components/team/pending-invites.tsx',
      'utf8',
    );
    return c.includes('resendInvite') || c.includes('Resend');
  });

  console.log('\nENV VARS');
  await check('NEXT_PUBLIC_APP_URL set', () => !!process.env.NEXT_PUBLIC_APP_URL);
  await check('CLERK_SECRET_KEY set', () => !!process.env.CLERK_SECRET_KEY);

  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ USER.1 PASSED — ${passed} checks`);
    console.log('⚠️  Manually test:');
    console.log('    - Send invite → email received → accept → land in org');
    console.log('    - Revoke invite → link no longer works');
    console.log('    - Non-Admin cannot see invite form\n');
  } else {
    console.log(`\n❌ USER.1 FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
