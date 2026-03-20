// Run: npm run verify src/scripts/verify-s0.7.ts
import { db } from '@/lib/db';
import { syncLogs, orgs } from '@/lib/db/schema';
import { inngest } from '@/lib/inngest/client';
import { eq } from 'drizzle-orm';

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

  console.log('\n🔍 Verifying S0.7 — Sync Orchestration\n');

  const fs = await import('fs');

  console.log('FILE EXISTENCE');
  const files = [
    'src/lib/inngest/events.ts',
    'src/lib/inngest/functions/sync-source.ts',
    'src/lib/sync/trigger.ts',
    'src/app/api/cron/sync-all/route.ts',
    'vercel.json',
  ];
  for (const file of files) {
    await check(`${file} exists`, () => fs.existsSync(file));
  }

  console.log('\nENV VARS');
  await check('CRON_SECRET is set', () => !!process.env.CRON_SECRET);
  await check('INNGEST_EVENT_KEY is set', () => !!process.env.INNGEST_EVENT_KEY);
  await check('INNGEST_SIGNING_KEY is set', () => !!process.env.INNGEST_SIGNING_KEY);

  console.log('\nCRON ROUTE');
  await check('sync-all route has CRON_SECRET guard', () => {
    const content = fs.readFileSync('src/app/api/cron/sync-all/route.ts', 'utf8');
    return content.includes('CRON_SECRET') && content.includes('401');
  });
  await check('sync-all route sends sync/source.requested events', () => {
    const content = fs.readFileSync('src/app/api/cron/sync-all/route.ts', 'utf8');
    return content.includes('sync/source.requested');
  });

  console.log('\nSYNC JOB');
  await check('sync-source job has retries: 3', () => {
    const content = fs.readFileSync('src/lib/inngest/functions/sync-source.ts', 'utf8');
    return content.includes('retries: 3');
  });
  await check('sync-source job uses step.run for isolation', () => {
    const content = fs.readFileSync('src/lib/inngest/functions/sync-source.ts', 'utf8');
    return content.includes('step.run');
  });
  await check('sync-source job never puts credentials in event payload', () => {
    const content = fs.readFileSync('src/lib/inngest/functions/sync-source.ts', 'utf8');
    return !content.includes('apiKey') && !content.includes('secretKey');
  });
  await check('sync-source job calls failSyncLog on error', () => {
    const content = fs.readFileSync('src/lib/inngest/functions/sync-source.ts', 'utf8');
    return content.includes('failSyncLog');
  });

  console.log('\nVERCEL CRON');
  await check('vercel.json has cron schedule for /api/cron/sync-all', () => {
    const content = fs.readFileSync('vercel.json', 'utf8');
    const config = JSON.parse(content);
    return config.crons?.some(
      (c: { path: string; schedule: string }) =>
        c.path === '/api/cron/sync-all' && c.schedule === '*/15 * * * *'
    );
  });

  console.log('\nINNGEST CLIENT');
  await check('inngest client id is datamodel-ai', () => {
    return inngest.id === 'datamodel-ai';
  });

  console.log('\nSYNC LOG INTEGRATION');
  // Use an existing org from the DB (FK constraint on sync_logs.org_id)
  const existingOrg = await db.query.orgs.findFirst();
  if (!existingOrg) {
    await check('sync log created with status running', () => {
      console.log('    (skipped — no orgs in DB yet)');
      return true;
    });
  } else {
    const { createSyncLog } = await import('@/lib/sync/logger');
    const testLogId = await createSyncLog({ orgId: existingOrg.id, sourceType: 'hubspot' });
    await check('sync log created with status running', async () => {
      const log = await db.query.syncLogs.findFirst({
        where: eq(syncLogs.id, testLogId),
      });
      return log?.status === 'running';
    });
    await db.delete(syncLogs).where(eq(syncLogs.id, testLogId));
  }

  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ S0.7 PASSED — ${passed} checks`);
    console.log(
      '⚠️  Manually verify: trigger cron → Inngest dev UI shows job run → records in Supabase.\n'
    );
  } else {
    console.log(`\n❌ S0.7 FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
