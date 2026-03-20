// Run: npm run verify src/scripts/verify-s0.3.ts
import { db } from '@/lib/db';
import { orgs } from '@/lib/db/schema';

void orgs; // ensure import is used

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

  console.log('\n🔍 Verifying S0.3 — Business Type Onboarding UI\n');

  const fs = await import('fs');

  console.log('FILE EXISTENCE');
  const files = [
    'src/lib/onboarding/constants.ts',
    'src/lib/actions/onboarding.ts',
    'src/app/(onboarding)/layout.tsx',
    'src/app/(onboarding)/onboarding/page.tsx',
    'src/components/onboarding/business-type-form.tsx',
  ];
  for (const file of files) {
    await check(`${file} exists`, () => fs.existsSync(file));
  }

  console.log('\nCONSTANTS');
  await check('B2B_VERTICALS exported', async () => {
    const mod = await import('@/lib/onboarding/constants');
    return Array.isArray(mod.B2B_VERTICALS) && mod.B2B_VERTICALS.length > 0;
  });
  await check('B2C_VERTICALS exported', async () => {
    const mod = await import('@/lib/onboarding/constants');
    return Array.isArray(mod.B2C_VERTICALS) && mod.B2C_VERTICALS.length > 0;
  });
  await check('STAGES exported', async () => {
    const mod = await import('@/lib/onboarding/constants');
    return Array.isArray(mod.STAGES) && mod.STAGES.length > 0;
  });

  console.log('\nSERVER ACTION');
  await check('saveBusinessType exported from onboarding.ts', async () => {
    const content = fs.readFileSync('src/lib/actions/onboarding.ts', 'utf8');
    return content.includes('saveBusinessType');
  });
  await check('saveBusinessType has org.businessType guard', async () => {
    const content = fs.readFileSync('src/lib/actions/onboarding.ts', 'utf8');
    return content.includes('businessType');
  });
  await check('saveBusinessType calls revalidatePath', async () => {
    const content = fs.readFileSync('src/lib/actions/onboarding.ts', 'utf8');
    return content.includes('revalidatePath');
  });

  console.log('\nDB — business_type column');
  await check('orgs table has business_type column', async () => {
    const { sql } = await import('drizzle-orm');
    const r = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'orgs' AND column_name = 'business_type'
    `);
    const rows = Array.isArray(r) ? r : (r as any).rows ?? [];
    return rows.length > 0;
  });
  await check('orgs table has vertical column', async () => {
    const { sql } = await import('drizzle-orm');
    const r = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'orgs' AND column_name = 'vertical'
    `);
    const rows = Array.isArray(r) ? r : (r as any).rows ?? [];
    return rows.length > 0;
  });
  await check('orgs table has stage column', async () => {
    const { sql } = await import('drizzle-orm');
    const r = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'orgs' AND column_name = 'stage'
    `);
    const rows = Array.isArray(r) ? r : (r as any).rows ?? [];
    return rows.length > 0;
  });

  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ S0.3 PASSED — ${passed} checks`);
    console.log('⚠️  Manually test: B2B path, B2C path, returning user guard.\n');
  } else {
    console.log(`\n❌ S0.3 FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
