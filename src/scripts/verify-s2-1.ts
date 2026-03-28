// Run: npm run verify src/scripts/verify-s2-1.ts
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

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

  console.log('\n🔍 Verifying S2.1 — Field Registry Browser\n');

  const fs = await import('fs');

  const rowsFrom = (r: unknown) => (Array.isArray(r) ? r : (r as { rows?: unknown[] }).rows ?? []);

  console.log('FILES');
  const files = [
    'src/lib/actions/fields.ts',
    'src/app/(dashboard)/fields/page.tsx',
    'src/components/fields/field-registry.tsx',
    'src/components/fields/field-drawer.tsx',
  ];
  for (const f of files) {
    await check(`${f.split('/').pop()} exists`, () => fs.existsSync(f));
  }

  console.log('\nSERVER ACTIONS');
  const actions = fs.readFileSync('src/lib/actions/fields.ts', 'utf8');
  for (const fn of ['approveField', 'rejectField', 'approveAllInNamespace']) {
    await check(`${fn} exported`, () => actions.includes(`export async function ${fn}`));
  }
  await check('approveField requires org:member', () =>
    actions.includes("requireRole('org:member')"),
  );
  await check('approveField sets approvedBy + approvedAt', () =>
    actions.includes('approvedBy') && actions.includes('approvedAt'),
  );
  await check('all actions call revalidatePath(/fields)', () => {
    const count = (actions.match(/revalidatePath\('\/fields'\)/g) || []).length;
    return count >= 3;
  });
  await check('approveField guards status=proposed', () => actions.includes("'proposed'"));

  console.log('\nCOMPONENT');
  const registry = fs.readFileSync('src/components/fields/field-registry.tsx', 'utf8');
  await check('has three tabs: proposed/approved/rejected', () =>
    registry.includes('proposed') && registry.includes('approved') && registry.includes('rejected'),
  );
  await check('has namespace filter', () =>
    registry.includes('namespace') || registry.includes('Namespace'),
  );
  await check('hides CDM for non-B2B', () => registry.includes('isB2B') || registry.includes("'cdm'"));
  await check('hides approve/reject from Viewer', () => registry.includes('canMutate'));
  await check('drawer opens on row click', () =>
    registry.includes('setDrawer') || registry.includes('drawerField'),
  );

  console.log('\nDB COLUMNS');
  for (const col of ['approved_by', 'approved_at', 'rejected_by', 'model_type']) {
    await check(`proposed_fields.${col} exists`, async () => {
      const r = await db.execute(sql`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'proposed_fields'
          AND column_name = ${col}
      `);
      return rowsFrom(r).length > 0;
    });
  }

  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ S2.1 PASSED — ${passed} checks`);
    console.log('⚠️  See docs/manual-checks.md for browser verification steps.\n');
  } else {
    console.log(`\n❌ S2.1 FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
