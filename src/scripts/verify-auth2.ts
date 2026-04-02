// src/scripts/verify-auth2.ts
// Run: npm run verify src/scripts/verify-auth2.ts

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

  console.log('\n🔍 Verifying AUTH.2 — Sign-In Flow\n');

  const fs = await import('fs');

  console.log('FILE EXISTENCE');
  await check('sign-in page exists', () =>
    fs.existsSync("src/app/(auth)/sign-in/[[...sign-in]]/page.tsx")
  );

  console.log('\nSIGN-IN PAGE');
  await check('two-column layout (lg:grid-cols-2)', () => {
    const content = fs.readFileSync(
      "src/app/(auth)/sign-in/[[...sign-in]]/page.tsx", 'utf8'
    );
    return content.includes('lg:grid-cols-2');
  });
  await check('imports and uses ValueProps', () => {
    const content = fs.readFileSync(
      "src/app/(auth)/sign-in/[[...sign-in]]/page.tsx", 'utf8'
    );
    return content.includes('ValueProps');
  });
  await check('redirect to "/" after sign-in (forceRedirectUrl or afterSignInUrl)', () => {
    const content = fs.readFileSync(
      "src/app/(auth)/sign-in/[[...sign-in]]/page.tsx", 'utf8'
    );
    return (
      (content.includes('forceRedirectUrl') || content.includes('afterSignInUrl')) &&
      content.includes('"/"')
    );
  });
  await check('signUpUrl = /sign-up', () => {
    const content = fs.readFileSync(
      "src/app/(auth)/sign-in/[[...sign-in]]/page.tsx", 'utf8'
    );
    return content.includes('/sign-up');
  });
  await check('mobile header fallback (lg:hidden)', () => {
    const content = fs.readFileSync(
      "src/app/(auth)/sign-in/[[...sign-in]]/page.tsx", 'utf8'
    );
    return content.includes('lg:hidden');
  });
  await check('SignUp path wired (signUpUrl on SignIn — Clerk shows footer link)', () => {
    const content = fs.readFileSync(
      "src/app/(auth)/sign-in/[[...sign-in]]/page.tsx", 'utf8'
    );
    return content.includes('signUpUrl="/sign-up"');
  });
  await check('left panel hidden on mobile (hidden lg:flex)', () => {
    const content = fs.readFileSync(
      "src/app/(auth)/sign-in/[[...sign-in]]/page.tsx", 'utf8'
    );
    return content.includes('hidden lg:flex');
  });

  console.log('\nROUTING');
  await check('root page has orgId + /create-org + /dashboard routing', () => {
    const content = fs.readFileSync('src/app/page.tsx', 'utf8');
    return (
      content.includes('orgId') &&
      content.includes('/create-org') &&
      content.includes('/dashboard')
    );
  });

  console.log('\nENV VARS');
  await check('NEXT_PUBLIC_CLERK_SIGN_IN_URL = /sign-in', () =>
    process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL === '/sign-in'
  );
  await check('NEXT_PUBLIC_CLERK_SIGN_UP_URL = /sign-up', () =>
    process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL === '/sign-up'
  );

  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ AUTH.2 PASSED — ${passed} checks`);
    console.log('⚠️  Manually test: email sign-in, Google OAuth, wrong credentials, MFA if enrolled.\n');
  } else {
    console.log(`\n❌ AUTH.2 FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
