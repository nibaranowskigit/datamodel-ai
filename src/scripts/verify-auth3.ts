// Run: npm run verify src/scripts/verify-auth3.ts
export {};

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

  console.log('\n🔍 Verifying AUTH.3 — Org Creation Gate\n');

  const fs = await import('fs');

  console.log('FILE EXISTENCE');
  const files = [
    'src/lib/auth.ts',
    'src/app/page.tsx',
    'src/app/(auth)/create-org/page.tsx',
    'src/app/(dashboard)/dashboard/page.tsx',
    'src/app/(onboarding)/onboarding/page.tsx',
    'src/middleware.ts',
  ];
  for (const file of files) {
    await check(`${file} exists`, () => fs.existsSync(file));
  }

  console.log('\nAUTH HELPERS');
  await check('auth.ts exports orgGuard', async () => {
    const content = fs.readFileSync('src/lib/auth.ts', 'utf8');
    return content.includes('orgGuard');
  });
  await check('auth.ts exports getAuth', async () => {
    const content = fs.readFileSync('src/lib/auth.ts', 'utf8');
    return content.includes('getAuth');
  });
  await check('getAuth throws Unauthorized when orgId null', async () => {
    const content = fs.readFileSync('src/lib/auth.ts', 'utf8');
    return content.includes('Unauthorized');
  });
  await check('orgGuard redirects to /create-org', async () => {
    const content = fs.readFileSync('src/lib/auth.ts', 'utf8');
    return content.includes('/create-org');
  });

  console.log('\nROUTING');
  await check('root page handles userId + orgId routing', () => {
    const content = fs.readFileSync('src/app/page.tsx', 'utf8');
    return (
      content.includes('orgId') &&
      content.includes('/create-org') &&
      content.includes('/dashboard') &&
      content.includes('/sign-in')
    );
  });
  await check('dashboard page uses orgGuard', () => {
    const content = fs.readFileSync('src/app/(dashboard)/dashboard/page.tsx', 'utf8');
    return content.includes('orgGuard');
  });
  await check('onboarding page uses orgGuard', () => {
    const content = fs.readFileSync('src/app/(onboarding)/onboarding/page.tsx', 'utf8');
    return content.includes('orgGuard');
  });
  await check('onboarding/connect page uses orgGuard', () => {
    const content = fs.readFileSync('src/app/(onboarding)/onboarding/connect/page.tsx', 'utf8');
    return content.includes('orgGuard');
  });
  await check('settings/sources page uses orgGuard', () => {
    const content = fs.readFileSync('src/app/(dashboard)/settings/sources/page.tsx', 'utf8');
    return content.includes('orgGuard');
  });
  await check('settings/team page uses orgGuard', () => {
    const content = fs.readFileSync('src/app/(dashboard)/settings/team/page.tsx', 'utf8');
    return content.includes('orgGuard');
  });
  await check('create-org page redirects if orgId already set', () => {
    const content = fs.readFileSync('src/app/(auth)/create-org/page.tsx', 'utf8');
    return content.includes('orgId') && content.includes('redirect');
  });

  console.log('\nMIDDLEWARE');
  await check('middleware protects /dashboard', () => {
    const content = fs.readFileSync('src/middleware.ts', 'utf8');
    return content.includes('/dashboard');
  });
  await check('middleware protects /data-model', () => {
    const content = fs.readFileSync('src/middleware.ts', 'utf8');
    return content.includes('/data-model');
  });
  await check('middleware protects /settings', () => {
    const content = fs.readFileSync('src/middleware.ts', 'utf8');
    return content.includes('/settings');
  });
  await check('middleware protects /onboarding', () => {
    const content = fs.readFileSync('src/middleware.ts', 'utf8');
    return content.includes('/onboarding');
  });
  await check('middleware protects /agents', () => {
    const content = fs.readFileSync('src/middleware.ts', 'utf8');
    return content.includes('/agents');
  });

  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ AUTH.3 PASSED — ${passed} checks`);
    console.log('⚠️  Manually test all three paths:');
    console.log('    1. Not signed in → /sign-in');
    console.log('    2. Signed in, no org → /create-org');
    console.log('    3. Signed in, with org → /dashboard\n');
  } else {
    console.log(`\n❌ AUTH.3 FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
