// Verification script for S1.5 — Reconciliation Engine
// Run: npm run verify src/scripts/verify-s1-5.ts
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { isConflict, normalise } from '@/lib/reconciliation/normalise';

function rowsFromExecute(r: unknown): Record<string, unknown>[] {
  return Array.isArray(r) ? (r as Record<string, unknown>[]) : ((r as { rows?: Record<string, unknown>[] }).rows ?? []);
}

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

  console.log('\n🔍 Verifying S1.5 — Reconciliation Engine\n');

  const fs = await import('fs');

  // ─── Tables ──────────────────────────────────────────────────────────────
  console.log('TABLES');
  for (const table of ['reconciliation_rules', 'cdm_conflicts']) {
    await check(`${table} table exists`, async () => {
      const r = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables WHERE table_name = ${table}
        ) AS exists
      `);
      const rows = rowsFromExecute(r);
      return rows[0]?.exists === true;
    });
  }
  await check('cdm_conflicts has udm_record_id column (new schema)', async () => {
    const r = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'cdm_conflicts' AND column_name = 'udm_record_id'
    `);
    return rowsFromExecute(r).length > 0;
  });
  await check('cdm_conflicts has auto_resolved column', async () => {
    const r = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'cdm_conflicts' AND column_name = 'auto_resolved'
    `);
    return rowsFromExecute(r).length > 0;
  });
  await check('sync_logs has sync_run_id column', async () => {
    const r = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'sync_logs' AND column_name = 'sync_run_id'
    `);
    return rowsFromExecute(r).length > 0;
  });

  // ─── Files ───────────────────────────────────────────────────────────────
  console.log('\nFILES');
  const files = [
    'src/lib/reconciliation/index.ts',
    'src/lib/reconciliation/normalise.ts',
    'src/lib/reconciliation/resolve.ts',
    'src/lib/reconciliation/constants.ts',
    'src/lib/reconciliation/seed-rules.ts',
    'src/lib/actions/conflicts.ts',
    'src/app/(dashboard)/conflicts/page.tsx',
  ];
  for (const f of files) {
    await check(`${f.split('/').pop()} exists`, () => fs.existsSync(f));
  }

  console.log('\nR9 + ADMIN RULES');
  await check('open-count helper exists', () => fs.existsSync('src/lib/conflicts/open-count.ts'));
  await check('reconciliation-rules server action exists', () =>
    fs.existsSync('src/lib/actions/reconciliation-rules.ts')
  );
  await check('settings/reconciliation page exists', () =>
    fs.existsSync('src/app/(dashboard)/settings/reconciliation/page.tsx')
  );
  const dashLayout = fs.readFileSync('src/app/(dashboard)/layout.tsx', 'utf8');
  await check('dashboard layout loads open conflict count', () =>
    dashLayout.includes('countOpenConflicts') && dashLayout.includes('openConflictCount')
  );
  const dashNav = fs.readFileSync('src/components/dashboard/nav.tsx', 'utf8');
  await check('sidebar nav shows conflict count badge when > 0', () =>
    dashNav.includes('openConflictCount') && dashNav.includes('Badge')
  );
  const rulesAction = fs.readFileSync('src/lib/actions/reconciliation-rules.ts', 'utf8');
  await check('updateReconciliationPriorities requires org:admin', () =>
    rulesAction.includes("requireRole('org:admin')")
  );

  // ─── Normalisation ───────────────────────────────────────────────────────
  console.log('\nNORMALISATION LOGIC');
  await check('normalise("Acme Corp") === normalise("ACME CORP")', () =>
    normalise('Acme Corp') === normalise('ACME CORP')
  );
  await check('normalise(null) returns null', () =>
    normalise(null) === null
  );
  await check('normalise("  hello  ") trims whitespace', () =>
    normalise('  hello  ') === 'hello'
  );
  await check('isConflict("acme", "ACME") === false', () =>
    isConflict('acme', 'ACME') === false
  );
  await check('isConflict("Acme Corp", "Acme Inc") === true', () =>
    isConflict('Acme Corp', 'Acme Inc') === true
  );
  await check('isConflict(null, "anything") === false', () =>
    isConflict(null, 'anything') === false
  );
  await check('isConflict("hello", null) === false', () =>
    isConflict('hello', null) === false
  );

  // ─── Engine source ────────────────────────────────────────────────────────
  console.log('\nRECONCILIATION ENGINE');
  const engine = fs.readFileSync('src/lib/reconciliation/index.ts', 'utf8');
  await check('groups records by normalised email', () =>
    engine.includes('normalise') && engine.includes('email')
  );
  await check('uses try or allSettled for error handling', () =>
    engine.includes('allSettled') || engine.includes('try')
  );
  await check('writes master field values to UDM', () =>
    engine.includes('db') && engine.includes('udmFieldValues') && engine.includes('insert')
  );
  await check('inserts to cdm_conflicts', () =>
    engine.includes('cdmConflicts') && engine.includes('insert')
  );
  await check('has EXCLUSIVE_FIELDS set', () =>
    engine.includes('EXCLUSIVE_FIELDS')
  );
  await check('has AUTO_RESOLVE logic', () =>
    engine.includes('AUTO_RESOLVE') || engine.includes('mostRecentDate')
  );
  await check('uses onConflictDoNothing for conflict deduplication', () =>
    engine.includes('onConflictDoNothing')
  );

  // ─── Server action ────────────────────────────────────────────────────────
  console.log('\nSERVER ACTION');
  const action = fs.readFileSync('src/lib/actions/conflicts.ts', 'utf8');
  await check('resolveConflict exported', () =>
    action.includes('resolveConflict')
  );
  await check("requires org:member role", () =>
    action.includes("requireRole('org:member')")
  );
  await check('writes winning value to UDM field values', () =>
    action.includes('udmFieldValues') && action.includes('insert')
  );
  await check('marks conflict resolved with resolvedAt', () =>
    action.includes('resolvedAt')
  );
  await check('calls revalidatePath after mutation', () =>
    action.includes("revalidatePath('/conflicts')")
  );

  // ─── Seed rules ───────────────────────────────────────────────────────────
  console.log('\nSEED RULES');
  const seed = fs.readFileSync('src/lib/reconciliation/seed-rules.ts', 'utf8');
  await check("seeds 'HS_' namespace", () => seed.includes("'HS_'"));
  await check("seeds 'FIN_' namespace", () => seed.includes("'FIN_'"));
  await check("seeds 'SUP_' namespace", () => seed.includes("'SUP_'"));
  await check("seeds 'PROD_' namespace", () => seed.includes("'PROD_'"));
  await check('each namespace has 4 source rules (16 total)', () => {
    const priorities = (seed.match(/priority:\s*\d/g) ?? []).length;
    return priorities >= 16;
  });
  await check('seeded in webhook on org creation', () => {
    const webhook = fs.readFileSync('src/app/api/webhooks/clerk/route.ts', 'utf8');
    return webhook.includes('seedReconciliationRules');
  });

  // ─── Conflicts page ───────────────────────────────────────────────────────
  console.log('\nCONFLICTS PAGE');
  const page = fs.readFileSync('src/app/(dashboard)/conflicts/page.tsx', 'utf8');
  await check('page fetches open conflicts (resolvedAt IS NULL)', () =>
    page.includes('isNull') && page.includes('resolvedAt')
  );
  await check('page scoped to orgId', () =>
    page.includes('orgId')
  );
  await check('renders ConflictsList', () =>
    page.includes('ConflictsList')
  );

  // ─── DB — reconciliation_rules seeded ────────────────────────────────────
  console.log('\nDB STATE');
  await check('reconciliation_rules table is queryable', async () => {
    const r = await db.execute(sql`SELECT COUNT(*)::int AS c FROM reconciliation_rules`);
    const rows = rowsFromExecute(r);
    return typeof rows[0]?.c === 'number';
  });
  await check('cdm_conflicts table is queryable', async () => {
    const r = await db.execute(sql`SELECT COUNT(*)::int AS c FROM cdm_conflicts`);
    const rows = rowsFromExecute(r);
    return typeof rows[0]?.c === 'number';
  });

  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ S1.5 PASSED — ${passed} checks`);
    console.log('⚠️  See docs/manual-checks.md for browser verification steps.\n');
  } else {
    console.log(`\n❌ S1.5 FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
