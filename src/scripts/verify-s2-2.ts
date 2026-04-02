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

  console.log('\n🔍 Verifying S2.2 — Record Browser + 360 View\n');

  const fs = await import('fs');

  console.log('FILES');
  const files = [
    'src/app/(dashboard)/records/page.tsx',
    'src/app/(dashboard)/records/users/[id]/page.tsx',
    'src/components/records/records-browser.tsx',
    'src/components/records/record-row.tsx',
    'src/components/records/record-360-view.tsx',
  ];
  for (const f of files) {
    await check(`${f} exists`, () => fs.existsSync(f));
  }

  console.log('\nRECORDS LIST PAGE');
  const listPage = fs.readFileSync('src/app/(dashboard)/records/page.tsx', 'utf8');
  await check('filters alias records (aliasOfId isNull)', () =>
    listPage.includes('aliasOfId'),
  );
  await check('paginates with limit + offset', () =>
    listPage.includes('limit') && listPage.includes('offset'),
  );
  await check('checks isB2B for org type', () =>
    listPage.includes('businessType') && listPage.includes('isB2B'),
  );

  console.log('\n360 VIEW PAGE');
  const detailPage = fs.readFileSync(
    'src/app/(dashboard)/records/users/[id]/page.tsx',
    'utf8',
  );
  await check('queries production / approved fields only', () =>
    detailPage.includes("'production'") ||
    detailPage.includes('"production"') ||
    detailPage.includes("'approved'") ||
    detailPage.includes('"approved"'),
  );
  await check('calls notFound() for missing record', () => detailPage.includes('notFound'));
  await check('scopes by orgId', () => detailPage.includes('orgId'));

  console.log('\n360 VIEW COMPONENT');
  const view = fs.readFileSync('src/components/records/record-360-view.tsx', 'utf8');
  await check('groups fields by namespace (HS_ FIN_ SUP_ PROD_)', () =>
    view.includes('HS_') && view.includes('FIN_') && view.includes('SUP_') && view.includes('PROD_'),
  );
  await check('hides empty namespace sections', () =>
    view.includes('length === 0'),
  );
  await check('shows completeness percentage', () =>
    view.includes('completeness') || view.includes('complete'),
  );
  await check('formatValue handles date type', () =>
    view.includes("'date'") && view.includes('toLocaleDateString'),
  );

  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ S2.2 PASSED — ${passed} checks`);
    console.log('⚠️  See docs/manual-checks.md for browser verification steps.\n');
  } else {
    console.log(`\n❌ S2.2 FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
