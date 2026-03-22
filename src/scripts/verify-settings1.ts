// Run: npm run verify src/scripts/verify-settings1.ts

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

  console.log('\n🔍 Verifying SETTINGS.1 — Settings Shell\n');

  const fs = await import('fs');

  console.log('ROUTE FILES');
  const routes = [
    'src/app/(dashboard)/settings/layout.tsx',
    'src/app/(dashboard)/settings/page.tsx',
    'src/app/(dashboard)/settings/profile/page.tsx',
    'src/app/(dashboard)/settings/team/page.tsx',
    'src/app/(dashboard)/settings/sources/page.tsx',
    'src/app/(dashboard)/settings/notifications/page.tsx',
    'src/app/(dashboard)/settings/api-keys/page.tsx',
    'src/app/(dashboard)/settings/billing/page.tsx',
    'src/app/(dashboard)/settings/danger/page.tsx',
  ];
  for (const route of routes) {
    await check(`${route.split('/settings/')[1] || 'layout'} exists`, () =>
      fs.existsSync(route)
    );
  }

  console.log('\nNAV COMPONENT');
  await check('settings-nav.tsx exists', () =>
    fs.existsSync('src/components/settings/settings-nav.tsx')
  );
  await check('settings-nav uses usePathname', () => {
    const c = fs.readFileSync('src/components/settings/settings-nav.tsx', 'utf8');
    return c.includes('usePathname');
  });
  await check('settings-nav has all 7 nav items', () => {
    const c = fs.readFileSync('src/components/settings/settings-nav.tsx', 'utf8');
    return (
      c.includes('/settings/profile') &&
      c.includes('/settings/team') &&
      c.includes('/settings/sources') &&
      c.includes('/settings/notifications') &&
      c.includes('/settings/api-keys') &&
      c.includes('/settings/billing') &&
      c.includes('/settings/danger')
    );
  });
  await check('danger zone is adminOnly gated', () => {
    const c = fs.readFileSync('src/components/settings/settings-nav.tsx', 'utf8');
    return c.includes('adminOnly') && c.includes('danger');
  });

  console.log('\nSETTINGS ROOT');
  await check('settings/page.tsx redirects to /settings/profile', () => {
    const c = fs.readFileSync('src/app/(dashboard)/settings/page.tsx', 'utf8');
    return c.includes('/settings/profile') && c.includes('redirect');
  });

  console.log('\nLAYOUT');
  await check('layout uses orgGuard', () => {
    const c = fs.readFileSync('src/app/(dashboard)/settings/layout.tsx', 'utf8');
    return c.includes('orgGuard');
  });
  await check('layout renders SettingsNav', () => {
    const c = fs.readFileSync('src/app/(dashboard)/settings/layout.tsx', 'utf8');
    return c.includes('SettingsNav');
  });

  console.log('\nDANGER PAGE');
  await check('danger page checks hasRole org:admin', () => {
    const c = fs.readFileSync('src/app/(dashboard)/settings/danger/page.tsx', 'utf8');
    return c.includes('hasRole') || c.includes('isAdmin');
  });
  await check('danger page redirects non-admin', () => {
    const c = fs.readFileSync('src/app/(dashboard)/settings/danger/page.tsx', 'utf8');
    return c.includes('redirect') && c.includes('/settings/profile');
  });

  console.log('\nDASHBOARD NAV');
  await check('dashboard nav has Settings link', () => {
    const c = fs.readFileSync('src/components/dashboard/nav.tsx', 'utf8');
    return c.includes('/settings') && c.includes('Settings');
  });

  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ SETTINGS.1 PASSED — ${passed} checks`);
    console.log('⚠️  Manually verify:');
    console.log('    - /settings redirects to /settings/profile');
    console.log('    - Active nav item highlighted on each route');
    console.log('    - Non-admin cannot access /settings/danger\n');
  } else {
    console.log(`\n❌ SETTINGS.1 FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
