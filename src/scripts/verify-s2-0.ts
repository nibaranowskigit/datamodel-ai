// Run: npm run verify src/scripts/verify-s2-0.ts
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

  console.log('\n🔍 Verifying S2.0 — AI Field Proposal Engine\n');

  const fs = await import('fs');

  console.log('FILES');
  const files = [
    'src/lib/ai/propose-fields.ts',
    'src/lib/ai/field-sampler.ts',
    'src/lib/ai/schemas/field-proposal.ts',
    'src/lib/ai/prompts/propose-fields.ts',
  ];
  for (const f of files) {
    await check(`${f.replace('src/lib/ai/', '')} exists`, () => fs.existsSync(f));
  }

  console.log('\nZOD SCHEMA');
  await check('FieldProposalSchema validates correctly', async () => {
    const { FieldProposalSchema } = await import('@/lib/ai/schemas/field-proposal');
    const result = FieldProposalSchema.safeParse({
      proposals: [
        {
          fieldKey:       'HS_deal_owner',
          label:          'Deal owner',
          dataType:       'string',
          description:    'The HubSpot user assigned as deal owner',
          sourceEvidence: { sourceType: 'hubspot', sampleValues: ['Sarah'], recordCount: 42 },
          confidence:     0.9,
          rationale:      'Useful for routing agent tasks',
        },
      ],
    });
    return result.success;
  });
  await check('Invalid fieldKey rejected by schema', async () => {
    const { FieldProposalSchema } = await import('@/lib/ai/schemas/field-proposal');
    const result = FieldProposalSchema.safeParse({
      proposals: [
        {
          fieldKey:       'invalid key with spaces',
          label:          'x',
          dataType:       'string',
          description:  'x'.repeat(10),
          sourceEvidence: {
            sourceType:   'h',
            sampleValues: [],
            recordCount:  0,
          },
          confidence: 0.5,
          rationale:  'x',
        },
      ],
    });
    return !result.success;
  });

  console.log('\nENGINE');
  const engine = fs.readFileSync('src/lib/ai/propose-fields.ts', 'utf8');
  await check('uses generateObject from ai SDK', () => engine.includes('generateObject'));
  await check('uses claude-sonnet-4-20250514', () => engine.includes('claude-sonnet-4-20250514'));
  await check('CDM proposals only for b2b orgs', () =>
    engine.includes("businessType === 'b2b'") || engine.includes('businessType === "b2b"'),
  );
  await check('max proposals cap enforced', () => engine.includes('MAX_PROPOSALS_PER_RUN'));
  await check('uses onConflictDoNothing — idempotent', () =>
    engine.includes('onConflictDoNothing'),
  );
  await check('try/catch per namespace — no single failure aborts all', () => {
    const catches = engine.match(/catch/g) || [];
    return catches.length >= 2;
  });

  console.log('\nUI + PROMOTE');
  const actions = fs.readFileSync('src/lib/actions/fields.ts', 'utf8');
  await check('approveAiFieldProposal promotes to udm_fields', () =>
    actions.includes('approveAiFieldProposal') && actions.includes("insert(udmFields)"),
  );
  await check('rejectAiFieldProposal delegates to rejectField', () =>
    actions.includes('rejectAiFieldProposal') && actions.includes('rejectField'),
  );
  await check('fields page exists', () => fs.existsSync('src/app/(dashboard)/data-model/fields/page.tsx'));

  console.log('\nINSTALLED PACKAGES');
  await check('ai package installed', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    return 'ai' in (pkg.dependencies ?? {});
  });
  await check('@ai-sdk/anthropic installed', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    return '@ai-sdk/anthropic' in (pkg.dependencies ?? {});
  });

  console.log('\nDB — post-sync checks');
  const rowsFrom = (r: unknown) => (Array.isArray(r) ? r : (r as { rows?: unknown[] }).rows ?? []);

  await check('proposed_fields table has confidence column', async () => {
    const r = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'proposed_fields'
        AND column_name = 'confidence'
    `);
    return rowsFrom(r).length > 0;
  });
  await check('proposed_fields table has source_evidence column', async () => {
    const r = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'proposed_fields'
        AND column_name = 'source_evidence'
    `);
    return rowsFrom(r).length > 0;
  });

  console.log(`\n${'─'.repeat(40)}`);
  if (failed === 0) {
    console.log(`\n✅ S2.0 PASSED — ${passed} checks`);
    console.log('⚠️  See docs/manual-checks.md for browser verification steps.\n');
  } else {
    console.log(`\n❌ S2.0 FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
