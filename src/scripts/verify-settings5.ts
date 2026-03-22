// Run: npm run verify src/scripts/verify-settings5.ts
import { db } from '@/lib/db';
import { generateApiKey, hashApiKey } from '@/lib/api-keys/generate';
import { sql } from 'drizzle-orm';
import fs from 'fs';

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

  console.log('\n🔍 Verifying SETTINGS.5 — API Keys\n');

  // ── TABLE ─────────────────────────────────────────────────────────────────

  console.log('TABLE');

  function rows(r: unknown): unknown[] {
    if (Array.isArray(r)) return r;
    const obj = r as { rows?: unknown[] };
    return obj.rows ?? [];
  }

  await check('api_keys table exists', async () => {
    const r = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables WHERE table_name = 'api_keys'
      ) AS "exists"
    `);
    const val = (rows(r)[0] as Record<string, unknown>)?.exists;
    return val === true || val === 'true' || val === 't';
  });

  for (const col of ['key_prefix', 'key_hash', 'revoked_at', 'last_used_at', 'scopes']) {
    await check(`api_keys.${col} column exists`, async () => {
      const r = await db.execute(sql`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'api_keys' AND column_name = ${col}
      `);
      return rows(r).length > 0;
    });
  }

  await check('key_hash index exists', async () => {
    const r = await db.execute(sql`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'api_keys' AND indexname LIKE '%key_hash%'
    `);
    return rows(r).length > 0;
  });

  // ── FILES ─────────────────────────────────────────────────────────────────

  console.log('\nFILES');

  const files = [
    'src/lib/api-keys/generate.ts',
    'src/lib/actions/api-keys.ts',
    'src/components/settings/api-keys-list.tsx',
  ];
  for (const f of files) {
    await check(`${f.split('/').pop()} exists`, () => fs.existsSync(f));
  }

  // ── KEY GENERATION ────────────────────────────────────────────────────────

  console.log('\nKEY GENERATION');

  await check('generateApiKey returns dm_live_ prefix', () => {
    const { fullKey } = generateApiKey();
    return fullKey.startsWith('dm_live_');
  });

  await check('generateApiKey produces consistent hash', () => {
    const { fullKey, hash } = generateApiKey();
    return hash === hashApiKey(fullKey);
  });

  await check('two keys are always different', () => {
    const a = generateApiKey();
    const b = generateApiKey();
    return a.fullKey !== b.fullKey && a.hash !== b.hash;
  });

  await check('key prefix is display-safe (has ellipsis)', () => {
    const { prefix } = generateApiKey();
    return prefix.includes('…');
  });

  // ── SERVER ACTIONS ────────────────────────────────────────────────────────

  console.log('\nSERVER ACTIONS');

  const actionsFile = fs.readFileSync('src/lib/actions/api-keys.ts', 'utf8');

  await check("createApiKey requires org:admin", () =>
    actionsFile.includes("requireRole('org:admin')")
  );

  await check('rotateApiKey uses transaction', () =>
    actionsFile.includes('transaction')
  );

  await check('revokeApiKey sets revokedAt', () =>
    actionsFile.includes('revokedAt')
  );

  await check('createApiKey never stores fullKey — only hash', () => {
    // keyHash must appear in the insert; fullKey must not be a property key in .values({})
    const valuesBlocks = actionsFile.match(/\.values\(\{[^}]+\}/g) ?? [];
    const noFullKeyInValues = valuesBlocks.every(
      (block) => !block.includes('fullKey')
    );
    return actionsFile.includes('keyHash') && noFullKeyInValues;
  });

  // ── PAGE QUERY ────────────────────────────────────────────────────────────

  console.log('\nPAGE QUERY');

  await check('page excludes keyHash from query', () => {
    const c = fs.readFileSync(
      'src/app/(dashboard)/settings/api-keys/page.tsx',
      'utf8'
    );
    return c.includes('keyHash: false');
  });

  // ── SUMMARY ───────────────────────────────────────────────────────────────

  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ SETTINGS.5 PASSED — ${passed} checks`);
    console.log('⚠️  See docs/manual-checks.md for browser verification steps.\n');
  } else {
    console.log(`\n❌ SETTINGS.5 FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
