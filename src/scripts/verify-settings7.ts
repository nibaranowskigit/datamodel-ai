// Run: npm run verify src/scripts/verify-settings7.ts
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

  console.log('\n🔍 Verifying SETTINGS.7 — User Avatar + Profile + Sign Out\n');

  const fs = await import('fs');

  console.log('FILES');
  const files = [
    'src/components/dashboard/user-avatar-button.tsx',
    'src/lib/actions/user-profile.ts',
    'src/app/(dashboard)/settings/me/page.tsx',
    'src/components/settings/user-profile-form.tsx',
  ];
  for (const f of files) {
    await check(`${f.split('/').pop()} exists`, () => fs.existsSync(f));
  }

  console.log('\nAVATAR BUTTON');
  await check('uses useUser from Clerk', () => {
    const c = fs.readFileSync(
      'src/components/dashboard/user-avatar-button.tsx',
      'utf8',
    );
    return c.includes('useUser');
  });
  await check('uses useClerk for signOut', () => {
    const c = fs.readFileSync(
      'src/components/dashboard/user-avatar-button.tsx',
      'utf8',
    );
    return c.includes('useClerk') && c.includes('signOut');
  });
  await check('redirects to /sign-in after sign out', () => {
    const c = fs.readFileSync(
      'src/components/dashboard/user-avatar-button.tsx',
      'utf8',
    );
    return c.includes('/sign-in');
  });
  await check('has outside click handler', () => {
    const c = fs.readFileSync(
      'src/components/dashboard/user-avatar-button.tsx',
      'utf8',
    );
    return c.includes('mousedown') || c.includes('outside');
  });
  await check('has Escape key handler', () => {
    const c = fs.readFileSync(
      'src/components/dashboard/user-avatar-button.tsx',
      'utf8',
    );
    return c.includes('Escape');
  });
  await check('has initials fallback', () => {
    const c = fs.readFileSync(
      'src/components/dashboard/user-avatar-button.tsx',
      'utf8',
    );
    return c.includes('Initials') || c.includes('initials');
  });

  console.log('\nSERVER ACTION');
  await check('updateUserProfile calls clerkClient().users.updateUser', () => {
    const c = fs.readFileSync('src/lib/actions/user-profile.ts', 'utf8');
    return c.includes('updateUser') && c.includes('clerkClient');
  });
  await check('validates empty firstName', () => {
    const c = fs.readFileSync('src/lib/actions/user-profile.ts', 'utf8');
    return c.includes('empty') || c.includes('trim');
  });
  await check('calls revalidatePath', () => {
    const c = fs.readFileSync('src/lib/actions/user-profile.ts', 'utf8');
    return c.includes('revalidatePath');
  });

  console.log('\nNAV');
  await check('settings-nav has /settings/me', () => {
    const c = fs.readFileSync(
      'src/components/settings/settings-nav.tsx',
      'utf8',
    );
    return c.includes('/settings/me');
  });

  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ SETTINGS.7 PASSED — ${passed} checks`);
    console.log(
      '⚠️  See docs/manual-checks.md for browser verification steps.\n',
    );
  } else {
    console.log(`\n❌ SETTINGS.7 FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
