// src/scripts/verify-user5.ts
// Run: npx tsx src/scripts/verify-user5.ts

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

  console.log('\n🔍 Verifying USER.5 — Accept Invite Flow\n');

  const fs = await import('fs');

  console.log('FILE EXISTENCE');
  await check('accept-invite page exists', () =>
    fs.existsSync('src/app/(auth)/accept-invite/page.tsx'),
  );
  await check('invite-expired page exists', () =>
    fs.existsSync('src/app/(auth)/invite-expired/page.tsx'),
  );

  console.log('\nINVITE ACTION');
  await check('inviteMember uses NEXT_PUBLIC_APP_URL for redirectUrl', () => {
    const c = fs.readFileSync('src/lib/actions/team.ts', 'utf8');
    return c.includes('NEXT_PUBLIC_APP_URL') && c.includes('redirectUrl');
  });
  await check('redirectUrl is absolute (not hardcoded relative path)', () => {
    const c = fs.readFileSync('src/lib/actions/team.ts', 'utf8');
    const hasRelativeOnly =
      c.includes("redirectUrl: '/dashboard'") ||
      c.includes('redirectUrl: "/dashboard"');
    return !hasRelativeOnly;
  });
  await check('resendInvite also uses NEXT_PUBLIC_APP_URL for redirectUrl', () => {
    const c = fs.readFileSync('src/lib/actions/team.ts', 'utf8');
    const occurrences = (c.match(/NEXT_PUBLIC_APP_URL/g) ?? []).length;
    return occurrences >= 2;
  });

  console.log('\nACCEPT INVITE PAGE');
  await check('has invite/join messaging', () => {
    const c = fs.readFileSync('src/app/(auth)/accept-invite/page.tsx', 'utf8');
    return (
      c.toLowerCase().includes('invite') || c.toLowerCase().includes('join')
    );
  });
  await check('uses bg-background (dark mode)', () => {
    const c = fs.readFileSync('src/app/(auth)/accept-invite/page.tsx', 'utf8');
    // The layout provides bg-background; page should not use bg-white
    return !c.includes('bg-white');
  });
  await check('does not hardcode any domain', () => {
    const c = fs.readFileSync('src/app/(auth)/accept-invite/page.tsx', 'utf8');
    return !c.includes('datamodel-ai.vercel.app') && !c.includes('localhost:3000');
  });
  await check('passes __clerk_ticket through to sign-up', () => {
    const c = fs.readFileSync('src/app/(auth)/accept-invite/page.tsx', 'utf8');
    return c.includes('__clerk_ticket');
  });
  await check('has sign-in fallback link', () => {
    const c = fs.readFileSync('src/app/(auth)/accept-invite/page.tsx', 'utf8');
    return c.includes('/sign-in');
  });

  console.log('\nEXPIRED PAGE');
  await check('invite-expired has expired messaging', () => {
    const c = fs.readFileSync('src/app/(auth)/invite-expired/page.tsx', 'utf8');
    return c.toLowerCase().includes('expired');
  });
  await check('invite-expired mentions Admin', () => {
    const c = fs.readFileSync('src/app/(auth)/invite-expired/page.tsx', 'utf8');
    return c.toLowerCase().includes('admin');
  });
  await check('invite-expired has sign-in link', () => {
    const c = fs.readFileSync('src/app/(auth)/invite-expired/page.tsx', 'utf8');
    return c.includes('/sign-in');
  });
  await check('invite-expired does not use bg-white', () => {
    const c = fs.readFileSync('src/app/(auth)/invite-expired/page.tsx', 'utf8');
    return !c.includes('bg-white');
  });

  console.log('\nENV VARS');
  await check('NEXT_PUBLIC_APP_URL is set', () => !!process.env.NEXT_PUBLIC_APP_URL);
  await check('NEXT_PUBLIC_APP_URL starts with https or http://localhost', () => {
    const url = process.env.NEXT_PUBLIC_APP_URL ?? '';
    return url.startsWith('https://') || url.startsWith('http://localhost');
  });

  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ USER.5 PASSED — ${passed} checks`);
    console.log('⚠️  Manually test:');
    console.log('    - Send real invite → accept as NEW user → lands on /dashboard in correct org');
    console.log('    - Send real invite → accept as EXISTING user → lands on /dashboard in correct org');
    console.log('    - Role on /dashboard matches role set at invite time');
    console.log('    - Expired invite → /invite-expired with clear message');
    console.log('    - Already-member clicks old invite → redirected to /dashboard\n');
  } else {
    console.log(`\n❌ USER.5 FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
