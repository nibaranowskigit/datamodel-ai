// src/scripts/verify-auth5.ts
// Run: npx tsx src/scripts/verify-auth5.ts

import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

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

  console.log('\n🔍 Verifying AUTH.5 — Password Reset + Email Verification\n');

  console.log('FILE EXISTENCE');
  await check('forgot-password page exists', () =>
    fs.existsSync('src/app/(auth)/forgot-password/page.tsx')
  );
  await check('verify-email page exists', () =>
    fs.existsSync('src/app/(auth)/verify-email/page.tsx')
  );
  await check('auth layout exists', () =>
    fs.existsSync('src/app/(auth)/layout.tsx')
  );

  console.log('\nFORGOT PASSWORD PAGE');
  await check('uses ForgotPassword component or SignIn from Clerk', () => {
    const content = fs.readFileSync(
      'src/app/(auth)/forgot-password/page.tsx',
      'utf8'
    );
    return content.includes('ForgotPassword') || content.includes('SignIn');
  });
  await check('has back to sign-in link', () => {
    const content = fs.readFileSync(
      'src/app/(auth)/forgot-password/page.tsx',
      'utf8'
    );
    return content.includes('/sign-in');
  });
  await check('uses bg-background (dark mode token)', () => {
    const content = fs.readFileSync(
      'src/app/(auth)/forgot-password/page.tsx',
      'utf8'
    );
    // Page renders inside auth layout which provides bg-background
    return (
      content.includes('bg-background') ||
      fs.readFileSync('src/app/(auth)/layout.tsx', 'utf8').includes('bg-background')
    );
  });

  console.log('\nVERIFY EMAIL PAGE');
  await check('has "check your email" messaging', () => {
    const content = fs.readFileSync(
      'src/app/(auth)/verify-email/page.tsx',
      'utf8'
    );
    return (
      content.toLowerCase().includes('email') &&
      (content.toLowerCase().includes('check') ||
        content.toLowerCase().includes('verify'))
    );
  });
  await check('uses bg-background (dark mode token)', () => {
    const content = fs.readFileSync(
      'src/app/(auth)/verify-email/page.tsx',
      'utf8'
    );
    return (
      content.includes('bg-background') ||
      fs.readFileSync('src/app/(auth)/layout.tsx', 'utf8').includes('bg-background')
    );
  });

  console.log('\nENV VARS');
  await check('CLERK_SECRET_KEY set', () => !!process.env.CLERK_SECRET_KEY);
  await check('NEXT_PUBLIC_CLERK_SIGN_IN_URL = /sign-in', () =>
    process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL === '/sign-in'
  );

  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ AUTH.5 PASSED — ${passed} checks`);
    console.log('⚠️  Manually test:');
    console.log('    - Password reset email received + reset completes');
    console.log('    - New sign-up → verification email received');
    console.log('    - Unverified user blocked from accessing app\n');
  } else {
    console.log(`\n❌ AUTH.5 FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
