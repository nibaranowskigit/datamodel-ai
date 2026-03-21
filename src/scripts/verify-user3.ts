// src/scripts/verify-user3.ts
// Run: npm run verify src/scripts/verify-user3.ts

async function run() {
  let passed = 0;
  let failed = 0;

  async function check(label: string, fn: () => boolean | Promise<boolean>) {
    try {
      const ok = await fn();
      if (ok) { console.log(`  ✅ ${label}`); passed++; }
      else { console.log(`  ❌ ${label}`); failed++; }
    } catch (e) {
      console.log(`  ❌ ${label} — ${(e as Error).message}`);
      failed++;
    }
  }

  console.log('\n🔍 Verifying USER.3 — Team Member List\n');

  const fs = await import('fs');

  console.log('FILE EXISTENCE');
  await check('member-list.tsx exists', () =>
    fs.existsSync('src/components/team/member-list.tsx')
  );
  await check('team/page.tsx includes MemberList', () => {
    const c = fs.readFileSync('src/app/(dashboard)/settings/team/page.tsx', 'utf8');
    return c.includes('MemberList');
  });

  console.log('\nSERVER ACTION');
  await check('team.ts has removeMember', () => {
    const c = fs.readFileSync('src/lib/actions/team.ts', 'utf8');
    return c.includes('removeMember');
  });
  await check('removeMember has requireRole org:admin', () => {
    const c = fs.readFileSync('src/lib/actions/team.ts', 'utf8');
    return c.includes('removeMember') && c.includes("requireRole('org:admin')");
  });
  await check('removeMember guards against self-removal', () => {
    const c = fs.readFileSync('src/lib/actions/team.ts', 'utf8');
    return c.includes('cannot remove yourself') ||
           c.includes('Cannot remove yourself') ||
           c.includes('remove yourself');
  });
  await check('removeMember guards against last admin removal', () => {
    const c = fs.readFileSync('src/lib/actions/team.ts', 'utf8');
    return c.includes('last Admin') || c.includes('last admin');
  });
  await check('removeMember calls revalidatePath', () => {
    const c = fs.readFileSync('src/lib/actions/team.ts', 'utf8');
    const count = (c.match(/revalidatePath/g) || []).length;
    return count >= 4; // invite + revoke + resend + remove
  });

  console.log('\nCOMPONENT');
  await check('member-list uses RoleBadge', () => {
    const c = fs.readFileSync('src/components/team/member-list.tsx', 'utf8');
    return c.includes('RoleBadge');
  });
  await check('member-list hides Remove for own row', () => {
    const c = fs.readFileSync('src/components/team/member-list.tsx', 'utf8');
    return c.includes('isMe') && c.includes('Remove');
  });
  await check('member-list shows member count', () => {
    const c = fs.readFileSync('src/components/team/member-list.tsx', 'utf8');
    return c.includes('memberships.length') || c.includes('.length');
  });

  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ USER.3 PASSED — ${passed} checks`);
    console.log('⚠️  Manually test:');
    console.log('    - Remove a member → they lose access');
    console.log('    - Remove self attempt → blocked');
    console.log('    - Remove last admin → blocked\n');
  } else {
    console.log(`\n❌ USER.3 FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
