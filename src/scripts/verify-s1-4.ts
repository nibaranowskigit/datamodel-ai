// Run: npm run verify src/scripts/verify-s1-4.ts
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

  console.log('\n🔍 Verifying S1.4 — Multi-Source Orchestration\n');

  const fs = await import('fs');

  // ─── TABLE ───────────────────────────────────────────────────────────
  console.log('TABLE');

  await check('sync_runs table exists', async () => {
    const r = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'sync_runs'
      ) AS exists
    `);
    const rows = Array.isArray(r) ? r : (r as any).rows ?? [];
    return rows[0]?.exists === true;
  });

  await check('sync_logs has sync_run_id column', async () => {
    const r = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'sync_logs' AND column_name = 'sync_run_id'
    `);
    const rows = Array.isArray(r) ? r : (r as any).rows ?? [];
    return rows.length > 0;
  });

  await check('sync_runs has org_id index', async () => {
    const r = await db.execute(sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'sync_runs' AND indexname = 'sync_runs_org_idx'
    `);
    const rows = Array.isArray(r) ? r : (r as any).rows ?? [];
    return rows.length > 0;
  });

  // ─── FILES ───────────────────────────────────────────────────────────
  console.log('\nFILES');

  for (const f of [
    'src/lib/inngest/functions/orchestrate-sync.ts',
    'src/lib/inngest/functions/sync-org-sources.ts',
    'src/lib/db/schema/sync-runs.ts',
    'src/lib/reconciliation/index.ts',
    'src/lib/ai/propose-fields.ts',
  ]) {
    await check(`${f.split('/').pop()} exists`, () => fs.existsSync(f));
  }

  // ─── ORCHESTRATOR ────────────────────────────────────────────────────
  console.log('\nORCHESTRATOR');

  const orch = fs.readFileSync('src/lib/inngest/functions/orchestrate-sync.ts', 'utf8');
  await check('cron every 6h', () => orch.includes('*/6'));
  await check('invokes syncOrgSources per org', () =>
    orch.includes('syncOrgSources') && orch.includes('step.invoke')
  );

  // ─── FAN-OUT ─────────────────────────────────────────────────────────
  console.log('\nFAN-OUT');

  const fanout = fs.readFileSync('src/lib/inngest/functions/sync-org-sources.ts', 'utf8');
  await check('uses Promise.allSettled', () => fanout.includes('allSettled'));
  await check('creates sync_runs row', () => fanout.includes('syncRuns'));
  await check('reconciliation after fan-out', () =>
    fanout.includes('reconcile') || fanout.includes('reconcileUDMRecords')
  );
  await check('field proposal after reconciliation', () =>
    fanout.includes('proposeFields') || fanout.includes('propose')
  );
  await check('failure notification wired', () => fanout.includes('notifySyncFailure'));
  await check('max 4 sources per batch', () => fanout.includes('i += 4'));

  // ─── REGISTRATION ────────────────────────────────────────────────────
  console.log('\nREGISTRATION');

  const route = fs.readFileSync('src/app/api/inngest/route.ts', 'utf8');
  await check('orchestrateSync registered', () => route.includes('orchestrateSync'));
  await check('syncOrgSources registered',  () => route.includes('syncOrgSources'));

  // ─── SCHEMA ──────────────────────────────────────────────────────────
  console.log('\nSCHEMA');

  const schemaIndex = fs.readFileSync('src/lib/db/schema/index.ts', 'utf8');
  await check('sync-runs exported from schema index', () => schemaIndex.includes('sync-runs'));

  const syncLogsSchema = fs.readFileSync('src/lib/db/schema/sync-logs.ts', 'utf8');
  await check('sync_logs schema has syncRunId field', () => syncLogsSchema.includes('syncRunId'));

  // ─── SUMMARY ─────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ S1.4 PASSED — ${passed} checks`);
    console.log('⚠️  See docs/manual-checks.md for browser verification steps.\n');
  } else {
    console.log(`\n❌ S1.4 FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
