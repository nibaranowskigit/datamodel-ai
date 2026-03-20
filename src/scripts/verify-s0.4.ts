// Run: npm run verify src/scripts/verify-s0.4.ts
import { db } from '@/lib/db';
import { dataSources, orgs } from '@/lib/db/schema';
import { encrypt, decrypt } from '@/lib/encryption';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

const TEST_ORG_ID = `org_verify_s04_${Date.now()}`;

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

  console.log('\n🔍 Verifying S0.4 — Source Connection Config + Encryption\n');

  console.log('ENV VARS');
  await check('ENCRYPTION_KEY is set', () => !!process.env.ENCRYPTION_KEY);
  await check('ENCRYPTION_KEY is 32 chars', () => process.env.ENCRYPTION_KEY!.length === 32);

  console.log('\nENCRYPTION');
  await check('encrypt() returns non-plaintext', () => {
    const plaintext = 'sk_test_supersecretkey123';
    const ciphertext = encrypt(plaintext);
    return !ciphertext.includes(plaintext);
  });
  await check('decrypt(encrypt(x)) === x', () => {
    const plaintext = 'sk_test_supersecretkey123';
    return decrypt(encrypt(plaintext)) === plaintext;
  });
  await check('encrypt() produces different output each call (random IV)', () => {
    const plaintext = 'same-key';
    return encrypt(plaintext) !== encrypt(plaintext);
  });
  await check('tampered ciphertext throws on decrypt', () => {
    try {
      const ciphertext = JSON.parse(encrypt('test')) as { iv: string; encrypted: string; tag: string };
      ciphertext.tag = 'aabbccdd'.repeat(4); // tamper auth tag
      decrypt(JSON.stringify(ciphertext));
      return false;
    } catch { return true; }
  });

  console.log('\nDATABASE');
  await check('data_sources table exists', async () => {
    const r = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables WHERE table_name = 'data_sources'
      ) as "exists"
    `);
    // drizzle-orm/postgres-js returns rows directly as an array
    const rows = Array.isArray(r) ? r : (r as unknown as { rows: unknown[] }).rows ?? [];
    const val = (rows[0] as Record<string, unknown>)?.exists;
    return val === true || val === 'true' || val === 't';
  });

  console.log('\nSOURCE CRUD');
  const sourceId = `src_verify_${Date.now()}`;
  const testConfig = { apiKey: 'hspot_test_key_abc123' };

  // Insert a temp org row to satisfy the FK constraint
  await db.insert(orgs).values({
    id: TEST_ORG_ID,
    name: 'Verify Test Org',
    plan: 'free',
    status: 'active',
    clerkOrgId: TEST_ORG_ID,
  }).onConflictDoNothing();

  await check('can insert source with encrypted config', async () => {
    await db.insert(dataSources).values({
      id: sourceId,
      orgId: TEST_ORG_ID,
      sourceType: 'hubspot',
      displayName: 'HubSpot Test',
      connectionConfig: encrypt(JSON.stringify(testConfig)),
      status: 'pending',
      createdBy: 'user_verify_test',
    });
    return true;
  });

  await check('stored config is not plaintext', async () => {
    const source = await db.query.dataSources.findFirst({
      where: eq(dataSources.id, sourceId),
    });
    return !source?.connectionConfig?.includes('hspot_test_key_abc123');
  });

  await check('can decrypt stored config', async () => {
    const source = await db.query.dataSources.findFirst({
      where: eq(dataSources.id, sourceId),
    });
    const decrypted = JSON.parse(decrypt(source!.connectionConfig!)) as typeof testConfig;
    return decrypted.apiKey === testConfig.apiKey;
  });

  await check('disconnect nulls connectionConfig + sets inactive', async () => {
    await db.update(dataSources)
      .set({ status: 'inactive', connectionConfig: null })
      .where(eq(dataSources.id, sourceId));
    const source = await db.query.dataSources.findFirst({
      where: eq(dataSources.id, sourceId),
    });
    return source?.status === 'inactive' && source?.connectionConfig === null;
  });

  // Cleanup test rows
  await db.delete(dataSources).where(eq(dataSources.id, sourceId));
  await db.delete(orgs).where(eq(orgs.id, TEST_ORG_ID));

  console.log('\nFILE EXISTENCE');
  const fs = await import('fs');
  const files = [
    'src/lib/encryption.ts',
    'src/lib/connectors/types.ts',
    'src/lib/connectors/config.ts',
    'src/lib/actions/sources.ts',
    'src/lib/onboarding/sources.ts',
    'src/app/(onboarding)/onboarding/connect/page.tsx',
  ];
  for (const file of files) {
    await check(`${file} exists`, () => fs.existsSync(file));
  }

  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ S0.4 PASSED — ${passed} checks\n`);
  } else {
    console.log(`\n❌ S0.4 FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
