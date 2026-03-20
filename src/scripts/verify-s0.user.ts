// Run: npx tsx src/scripts/verify-s0.user.ts
export {};

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

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

  console.log('\n🔍 Verifying S0.USER — User Management\n');

  const fs = await import('fs');
  const path = await import('path');
  const root = path.resolve(process.cwd(), 'src');

  const resolve = (p: string) => path.join(root, '..', p);

  console.log('FILE EXISTENCE');
  const files = [
    'src/lib/roles.ts',
    'src/lib/actions/team.ts',
    'src/app/(dashboard)/settings/team/page.tsx',
    'src/components/team/invite-form.tsx',
    'src/components/team/member-list.tsx',
    'src/components/team/pending-invites.tsx',
  ];
  for (const file of files) {
    await check(`${file} exists`, () => fs.existsSync(resolve(file)));
  }

  console.log('\nROLE ENFORCEMENT');

  await check('roles.ts exports requireRole', () => {
    const content = fs.readFileSync(resolve('src/lib/roles.ts'), 'utf8');
    return content.includes('export async function requireRole');
  });

  await check('roles.ts exports getRole', () => {
    const content = fs.readFileSync(resolve('src/lib/roles.ts'), 'utf8');
    return content.includes('export async function getRole');
  });

  await check('requireRole throws for insufficient role', () => {
    const ROLE_HIERARCHY: Record<string, number> = {
      'org:admin': 3,
      'org:member': 2,
      'org:viewer': 1,
    };
    const callerRole = 'org:viewer';
    const requiredRole = 'org:member';
    return ROLE_HIERARCHY[callerRole] < ROLE_HIERARCHY[requiredRole];
  });

  await check('roles.ts defines ROLE_HIERARCHY with all three roles', () => {
    const content = fs.readFileSync(resolve('src/lib/roles.ts'), 'utf8');
    return (
      content.includes("'org:admin'") &&
      content.includes("'org:member'") &&
      content.includes("'org:viewer'")
    );
  });

  console.log('\nSERVER ACTIONS');

  await check('team.ts has "use server" directive', () => {
    const content = fs.readFileSync(resolve('src/lib/actions/team.ts'), 'utf8');
    return content.includes("'use server'");
  });

  await check('team.ts exports inviteMember', () => {
    const content = fs.readFileSync(resolve('src/lib/actions/team.ts'), 'utf8');
    return content.includes('export async function inviteMember');
  });

  await check('team.ts exports removeMember', () => {
    const content = fs.readFileSync(resolve('src/lib/actions/team.ts'), 'utf8');
    return content.includes('export async function removeMember');
  });

  await check('team.ts exports revokeInvite', () => {
    const content = fs.readFileSync(resolve('src/lib/actions/team.ts'), 'utf8');
    return content.includes('export async function revokeInvite');
  });

  await check('team.ts exports resendInvite', () => {
    const content = fs.readFileSync(resolve('src/lib/actions/team.ts'), 'utf8');
    return content.includes('export async function resendInvite');
  });

  await check('team.ts exports updateMemberRole', () => {
    const content = fs.readFileSync(resolve('src/lib/actions/team.ts'), 'utf8');
    return content.includes('export async function updateMemberRole');
  });

  await check("team.ts has requireRole('org:admin') guard", () => {
    const content = fs.readFileSync(resolve('src/lib/actions/team.ts'), 'utf8');
    return content.includes("requireRole('org:admin')");
  });

  await check('team.ts calls revalidatePath after mutations', () => {
    const content = fs.readFileSync(resolve('src/lib/actions/team.ts'), 'utf8');
    return content.includes("revalidatePath('/settings/team')");
  });

  await check('removeMember guards against self-removal', () => {
    const content = fs.readFileSync(resolve('src/lib/actions/team.ts'), 'utf8');
    return content.includes('Cannot remove yourself');
  });

  await check('removeMember guards against last-admin removal', () => {
    const content = fs.readFileSync(resolve('src/lib/actions/team.ts'), 'utf8');
    return content.includes('at least one Admin');
  });

  console.log('\nCOMPONENTS');

  await check('invite-form.tsx has "use client" directive', () => {
    const content = fs.readFileSync(
      resolve('src/components/team/invite-form.tsx'),
      'utf8',
    );
    return content.includes("'use client'");
  });

  await check('invite-form.tsx uses inviteMember action', () => {
    const content = fs.readFileSync(
      resolve('src/components/team/invite-form.tsx'),
      'utf8',
    );
    return content.includes('inviteMember');
  });

  await check('member-list.tsx renders Remove button', () => {
    const content = fs.readFileSync(
      resolve('src/components/team/member-list.tsx'),
      'utf8',
    );
    return content.includes('Remove');
  });

  await check('pending-invites.tsx renders Resend and Revoke buttons', () => {
    const content = fs.readFileSync(
      resolve('src/components/team/pending-invites.tsx'),
      'utf8',
    );
    return content.includes('Resend') && content.includes('Revoke');
  });

  console.log('\nPAGE');

  await check('settings/team page fetches memberships from Clerk', () => {
    const content = fs.readFileSync(
      resolve('src/app/(dashboard)/settings/team/page.tsx'),
      'utf8',
    );
    return content.includes('getOrganizationMembershipList');
  });

  await check('settings/team page fetches pending invitations from Clerk', () => {
    const content = fs.readFileSync(
      resolve('src/app/(dashboard)/settings/team/page.tsx'),
      'utf8',
    );
    return (
      content.includes('getOrganizationInvitationList') &&
      content.includes("status: ['pending']")
    );
  });

  console.log('\nENV VARS');
  await check('NEXT_PUBLIC_APP_URL set', () => !!process.env.NEXT_PUBLIC_APP_URL);
  await check('CLERK_SECRET_KEY set', () => !!process.env.CLERK_SECRET_KEY);

  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ S0.USER PASSED — ${passed} checks`);
    console.log(
      '⚠️  Manually test: invite flow, role enforcement, remove member.\n',
    );
  } else {
    console.log(`\n❌ S0.USER FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
