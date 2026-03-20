// Run: npm run verify src/scripts/verify-s0.auth.ts
// Note: auth flows require manual browser testing — this script verifies
// route existence, redirect config, and Clerk env vars only.
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

  console.log('\n🔍 Verifying S0.AUTH — Login / Sign-Up Flow\n');

  console.log('ENV VARS');
  await check('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY set', () => !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  await check('CLERK_SECRET_KEY set', () => !!process.env.CLERK_SECRET_KEY);
  await check('NEXT_PUBLIC_CLERK_SIGN_IN_URL = /sign-in', () => process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL === '/sign-in');
  await check('NEXT_PUBLIC_CLERK_SIGN_UP_URL = /sign-up', () => process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL === '/sign-up');
  await check('NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL = /', () => process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL === '/');
  await check('NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL = /', () => process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL === '/');

  console.log('\nFILE EXISTENCE');
  const fs = await import('fs');
  const files = [
    'src/app/(auth)/layout.tsx',
    'src/app/(auth)/sign-in/[[...sign-in]]/page.tsx',
    'src/app/(auth)/sign-up/[[...sign-up]]/page.tsx',
    'src/app/(auth)/create-org/page.tsx',
    'src/app/page.tsx',
    'src/middleware.ts',
    'src/lib/auth.ts',
  ];
  for (const file of files) {
    await check(`${file} exists`, () => fs.existsSync(file));
  }

  console.log('\nROUTING LOGIC');
  await check('src/app/page.tsx contains orgId check', () => {
    const content = fs.readFileSync('src/app/page.tsx', 'utf8');
    return content.includes('orgId') && content.includes('/create-org') && content.includes('/dashboard');
  });
  await check('src/app/(auth)/create-org/page.tsx contains CreateOrganization', () => {
    const content = fs.readFileSync('src/app/(auth)/create-org/page.tsx', 'utf8');
    return content.includes('CreateOrganization');
  });
  await check('middleware.ts protects /dashboard and /onboarding', () => {
    const content = fs.readFileSync('src/middleware.ts', 'utf8');
    return content.includes('/dashboard') && content.includes('/onboarding');
  });

  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ S0.AUTH PASSED — ${passed} checks`);
    console.log('⚠️  Remember to manually test all three auth flows in the browser.\n');
  } else {
    console.log(`\n❌ S0.AUTH FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
