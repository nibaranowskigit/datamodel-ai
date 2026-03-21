// Run: npx tsx src/scripts/verify-user2.ts

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

  console.log('\n🔍 Verifying USER.2 — Role Model\n');

  console.log('FILE EXISTENCE');
  await check('src/lib/roles.ts exists', () => fs.existsSync('src/lib/roles.ts'));
  await check('src/components/team/role-badge.tsx exists', () =>
    fs.existsSync('src/components/team/role-badge.tsx'),
  );

  console.log('\nROLES.TS EXPORTS');
  await check('exports requireRole', () => {
    const c = fs.readFileSync('src/lib/roles.ts', 'utf8');
    return c.includes('export async function requireRole');
  });
  await check('exports getRole', () => {
    const c = fs.readFileSync('src/lib/roles.ts', 'utf8');
    return c.includes('export async function getRole');
  });
  await check('exports hasRole', () => {
    const c = fs.readFileSync('src/lib/roles.ts', 'utf8');
    return c.includes('export async function hasRole');
  });
  await check('exports requireAdmin shorthand', () => {
    const c = fs.readFileSync('src/lib/roles.ts', 'utf8');
    return c.includes('export async function requireAdmin');
  });
  await check('exports requireMember shorthand', () => {
    const c = fs.readFileSync('src/lib/roles.ts', 'utf8');
    return c.includes('export async function requireMember');
  });
  await check('exports OrgRole type', () => {
    const c = fs.readFileSync('src/lib/roles.ts', 'utf8');
    return c.includes('OrgRole') && c.includes('org:admin');
  });

  console.log('\nROLE HIERARCHY LOGIC');
  await check('hierarchy: admin=3 member=2 viewer=1', () => {
    const c = fs.readFileSync('src/lib/roles.ts', 'utf8');
    return (
      (c.includes("'org:admin':  3") || c.includes("'org:admin': 3") || c.includes('"org:admin": 3')) &&
      (c.includes("'org:member': 2") || c.includes('"org:member": 2')) &&
      (c.includes("'org:viewer': 1") || c.includes('"org:viewer": 1'))
    );
  });
  await check('requireRole throws Forbidden', () => {
    const c = fs.readFileSync('src/lib/roles.ts', 'utf8');
    return c.includes('Forbidden');
  });
  await check('requireRole throws Unauthorized', () => {
    const c = fs.readFileSync('src/lib/roles.ts', 'utf8');
    return c.includes('Unauthorized');
  });
  await check('requireRole throws Forbidden for no role assigned', () => {
    const c = fs.readFileSync('src/lib/roles.ts', 'utf8');
    return c.includes('no role assigned');
  });
  await check('hasRole returns boolean (does not throw)', () => {
    const c = fs.readFileSync('src/lib/roles.ts', 'utf8');
    return c.includes('return false') && c.includes('Promise<boolean>');
  });

  console.log('\nSERVER ACTIONS — ROLE GUARDS');
  await check('fields.ts has use server directive', () => {
    const c = fs.readFileSync('src/lib/actions/fields.ts', 'utf8');
    return c.includes("'use server'") || c.includes('"use server"');
  });
  await check('fields.ts imports requireRole', () => {
    const c = fs.readFileSync('src/lib/actions/fields.ts', 'utf8');
    return c.includes('requireRole') && c.includes('@/lib/roles');
  });
  await check('fields.ts approveField has requireRole org:member', () => {
    const c = fs.readFileSync('src/lib/actions/fields.ts', 'utf8');
    return (
      c.includes('approveField') &&
      (c.includes("requireRole('org:member')") || c.includes('requireRole("org:member")'))
    );
  });
  await check('fields.ts deprecateField has requireRole org:member', () => {
    const c = fs.readFileSync('src/lib/actions/fields.ts', 'utf8');
    return (
      c.includes('deprecateField') &&
      (c.includes("requireRole('org:member')") || c.includes('requireRole("org:member")'))
    );
  });
  await check('fields.ts createProposedField has requireRole org:member', () => {
    const c = fs.readFileSync('src/lib/actions/fields.ts', 'utf8');
    return (
      c.includes('createProposedField') &&
      (c.includes("requireRole('org:member')") || c.includes('requireRole("org:member")'))
    );
  });
  await check('sources.ts has use server directive', () => {
    const c = fs.readFileSync('src/lib/actions/sources.ts', 'utf8');
    return c.includes("'use server'") || c.includes('"use server"');
  });
  await check('sources.ts connectSource has requireRole org:member', () => {
    const c = fs.readFileSync('src/lib/actions/sources.ts', 'utf8');
    return (
      c.includes('connectSource') &&
      (c.includes("requireRole('org:member')") || c.includes('requireRole("org:member")'))
    );
  });
  await check('sources.ts disconnectSource has requireRole org:admin', () => {
    const c = fs.readFileSync('src/lib/actions/sources.ts', 'utf8');
    return (
      c.includes('disconnectSource') &&
      (c.includes("requireRole('org:admin')") || c.includes('requireRole("org:admin")'))
    );
  });
  await check('team.ts inviteMember has org:admin guard', () => {
    const c = fs.readFileSync('src/lib/actions/team.ts', 'utf8');
    return (
      c.includes('inviteMember') &&
      (c.includes("requireRole('org:admin')") || c.includes('requireRole("org:admin")'))
    );
  });
  await check('team.ts revokeInvite has org:admin guard', () => {
    const c = fs.readFileSync('src/lib/actions/team.ts', 'utf8');
    return (
      c.includes('revokeInvite') &&
      (c.includes("requireRole('org:admin')") || c.includes('requireRole("org:admin")'))
    );
  });
  await check('team.ts removeMember has org:admin guard', () => {
    const c = fs.readFileSync('src/lib/actions/team.ts', 'utf8');
    return (
      c.includes('removeMember') &&
      (c.includes("requireRole('org:admin')") || c.includes('requireRole("org:admin")'))
    );
  });

  console.log('\nROLE BADGE COMPONENT');
  await check('role-badge.tsx exports RoleBadge', () => {
    const c = fs.readFileSync('src/components/team/role-badge.tsx', 'utf8');
    return c.includes('export function RoleBadge');
  });
  await check('role-badge.tsx has all three role labels', () => {
    const c = fs.readFileSync('src/components/team/role-badge.tsx', 'utf8');
    return c.includes('Admin') && c.includes('Member') && c.includes('Viewer');
  });
  await check('role-badge.tsx imports OrgRole from @/lib/roles', () => {
    const c = fs.readFileSync('src/components/team/role-badge.tsx', 'utf8');
    return c.includes('OrgRole') && c.includes('@/lib/roles');
  });

  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ USER.2 PASSED — ${passed} checks`);
    console.log('⚠️  Manually test:');
    console.log('    - Viewer calling approveField → Forbidden error');
    console.log('    - Member calling inviteMember → Forbidden error');
    console.log('    - Admin calling both → passes\n');
  } else {
    console.log(`\n❌ USER.2 FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
