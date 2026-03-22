// Run: npm run verify src/scripts/verify-settings2.ts
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

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

  console.log('\n🔍 Verifying SETTINGS.2 — Org Profile Settings\n');

  const fs = await import('fs');

  console.log('FILES');
  const files = [
    'src/lib/actions/settings.ts',
    'src/app/(dashboard)/settings/profile/page.tsx',
    'src/components/settings/org-profile-form.tsx',
    'src/components/settings/org-profile-read-only.tsx',
  ];
  for (const f of files) {
    await check(`${f.split('/').pop()} exists`, () => fs.existsSync(f));
  }

  console.log('\nSERVER ACTION');
  await check('updateOrgProfile exported', () => {
    const c = fs.readFileSync('src/lib/actions/settings.ts', 'utf8');
    return c.includes('updateOrgProfile');
  });
  await check("has requireRole('org:admin')", () => {
    const c = fs.readFileSync('src/lib/actions/settings.ts', 'utf8');
    return c.includes("requireRole('org:admin')");
  });
  await check('updates orgs table', () => {
    const c = fs.readFileSync('src/lib/actions/settings.ts', 'utf8');
    return c.includes('db') && c.includes('update') && c.includes('orgs');
  });
  await check('syncs name to Clerk', () => {
    const c = fs.readFileSync('src/lib/actions/settings.ts', 'utf8');
    return c.includes('clerkClient') || c.includes('updateOrganization');
  });
  await check('calls revalidatePath', () => {
    const c = fs.readFileSync('src/lib/actions/settings.ts', 'utf8');
    return c.includes('revalidatePath');
  });
  await check('validates empty name', () => {
    const c = fs.readFileSync('src/lib/actions/settings.ts', 'utf8');
    return c.includes('empty') || c.includes('trim');
  });

  console.log('\nFORM COMPONENT');
  await check('form reuses onboarding constants', () => {
    const c = fs.readFileSync('src/components/settings/org-profile-form.tsx', 'utf8');
    return c.includes('B2B_VERTICALS') || c.includes('onboarding/constants');
  });
  await check('form shows business type warning on change', () => {
    const c = fs.readFileSync('src/components/settings/org-profile-form.tsx', 'utf8');
    return c.includes('typeChanged') || c.includes('warning') || c.includes('Warning');
  });
  await check('form has isDirty guard on save button', () => {
    const c = fs.readFileSync('src/components/settings/org-profile-form.tsx', 'utf8');
    return c.includes('isDirty');
  });

  console.log('\nDB');
  for (const col of ['name', 'business_type', 'vertical', 'stage']) {
    await check(`orgs.${col} column exists`, async () => {
      const r = await db.execute(sql`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'orgs' AND column_name = ${col}
      `);
      return (r as unknown as unknown[]).length > 0;
    });
  }

  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ SETTINGS.2 PASSED — ${passed} checks`);
    console.log('⚠️  Manually test: update name, change vertical, business type warning, read-only view.\n');
  } else {
    console.log(`\n❌ SETTINGS.2 FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
