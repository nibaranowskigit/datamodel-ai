// Run: npm run verify src/scripts/verify-auth4.ts
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

  console.log('\n🔍 Verifying AUTH.4 — Post-Auth Routing Logic\n');

  const fs = await import('fs');

  console.log('ROOT PAGE');
  await check('src/app/page.tsx exists', () => fs.existsSync('src/app/page.tsx'));
  await check('root page checks userId', () => {
    const content = fs.readFileSync('src/app/page.tsx', 'utf8');
    return content.includes('userId');
  });
  await check('root page checks orgId', () => {
    const content = fs.readFileSync('src/app/page.tsx', 'utf8');
    return content.includes('orgId');
  });
  await check('root page checks businessType', () => {
    const content = fs.readFileSync('src/app/page.tsx', 'utf8');
    return content.includes('businessType');
  });
  await check('root page redirects to /sign-in', () => {
    const content = fs.readFileSync('src/app/page.tsx', 'utf8');
    return content.includes('/sign-in');
  });
  await check('root page redirects to /create-org', () => {
    const content = fs.readFileSync('src/app/page.tsx', 'utf8');
    return content.includes('/create-org');
  });
  await check('root page redirects to /onboarding', () => {
    const content = fs.readFileSync('src/app/page.tsx', 'utf8');
    return content.includes('/onboarding');
  });
  await check('root page redirects to /dashboard', () => {
    const content = fs.readFileSync('src/app/page.tsx', 'utf8');
    return content.includes('/dashboard');
  });
  await check('root page queries DB with orgId scope', () => {
    const content = fs.readFileSync('src/app/page.tsx', 'utf8');
    return content.includes('orgs.id') || content.includes('eq(orgs');
  });

  console.log('\nONBOARDING PAGE');
  await check('onboarding page uses orgGuard', () => {
    const content = fs.readFileSync(
      'src/app/(onboarding)/onboarding/page.tsx', 'utf8'
    );
    return content.includes('orgGuard');
  });
  await check('onboarding page checks businessType', () => {
    const content = fs.readFileSync(
      'src/app/(onboarding)/onboarding/page.tsx', 'utf8'
    );
    return content.includes('businessType');
  });
  await check('onboarding page redirects to /dashboard if complete', () => {
    const content = fs.readFileSync(
      'src/app/(onboarding)/onboarding/page.tsx', 'utf8'
    );
    return content.includes('/dashboard') && content.includes('redirect');
  });

  console.log('\nDB');
  const { db } = await import('@/lib/db');
  const { sql } = await import('drizzle-orm');
  await check('orgs table has business_type column', async () => {
    const r = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'orgs' AND column_name = 'business_type'
    `);
    const rows = Array.isArray(r) ? r : (r as any).rows ?? [];
    return rows.length > 0;
  });

  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ AUTH.4 PASSED — ${passed} checks`);
    console.log('⚠️  Manually test all 5 routing paths in the browser.\n');
  } else {
    console.log(`\n❌ AUTH.4 FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
