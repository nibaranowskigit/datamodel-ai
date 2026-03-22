// src/scripts/verify-settings6.ts
// Run: npm run verify src/scripts/verify-settings6.ts

async function verifySettings6() {
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

  console.log('\n🔍 Verifying SETTINGS.6 — Danger Zone\n');

  const fs = await import('fs');

  console.log('FILES');
  const files = [
    'src/lib/actions/danger.ts',
    'src/components/settings/danger-zone-actions.tsx',
    'src/lib/inngest/functions/export-data.ts',
  ];
  for (const f of files) {
    await check(`${f.split('/').pop()} exists`, () => fs.existsSync(f));
  }

  console.log('\nSERVER ACTIONS — GUARDS');
  const actions = fs.readFileSync('src/lib/actions/danger.ts', 'utf8');
  for (const fn of ['requestDataExport', 'hardResetDataModel', 'deleteOrg']) {
    await check(`${fn} exported`, () => actions.includes(fn));
  }
  await check('all actions call requireRole org:admin', () => {
    const count = (actions.match(/requireRole\('org:admin'\)/g) ?? []).length;
    return count >= 3;
  });

  console.log('\nHARD RESET — SCOPE');
  await check('hardResetDataModel deletes cdmRecords', () =>
    actions.includes('cdmRecords') && actions.includes('hardResetDataModel'),
  );
  await check('hardResetDataModel deletes udmRecords', () =>
    actions.includes('udmRecords'),
  );
  await check('hardResetDataModel does NOT delete dataSources', () => {
    const resetStart = actions.indexOf('hardResetDataModel');
    const resetEnd   = actions.indexOf('export async function deleteOrg');
    const resetBody  = actions.slice(resetStart, resetEnd);
    return !resetBody.includes('dataSources');
  });
  await check('hardResetDataModel does NOT delete apiKeys', () => {
    const resetStart = actions.indexOf('hardResetDataModel');
    const resetEnd   = actions.indexOf('export async function deleteOrg');
    const resetBody  = actions.slice(resetStart, resetEnd);
    return !resetBody.includes('apiKeys');
  });

  console.log('\nDELETE ORG — CASCADE');
  await check('deleteOrg uses db.transaction', () =>
    actions.includes('transaction'),
  );
  await check('deleteOrg deletes Clerk org', () =>
    actions.includes('deleteOrganization'),
  );
  await check('deleteOrg redirects to /create-org', () =>
    actions.includes('/create-org'),
  );

  console.log('\nEXPORT — ASYNC');
  await check('requestDataExport sends Inngest event', () =>
    actions.includes('org/data.export.requested') || actions.includes('inngest.send'),
  );
  await check('exportOrgData Inngest function exists', () =>
    fs.existsSync('src/lib/inngest/functions/export-data.ts'),
  );
  await check('export function sends email with attachment', () => {
    const c = fs.readFileSync('src/lib/inngest/functions/export-data.ts', 'utf8');
    return c.includes('attachments') && c.includes('resend');
  });
  await check('exportOrgData registered in Inngest route', () => {
    const route = fs.readFileSync('src/app/api/inngest/route.ts', 'utf8');
    return route.includes('exportOrgData');
  });

  console.log('\nCOMPONENT');
  const comp = fs.readFileSync('src/components/settings/danger-zone-actions.tsx', 'utf8');
  await check('confirmation phrase for export', () =>
    comp.includes('export data'),
  );
  await check('confirmation phrase for reset', () =>
    comp.includes('reset data model'),
  );
  await check('confirmation phrase for delete', () =>
    comp.includes('delete my org'),
  );
  await check('button disabled until phrase matches', () =>
    comp.includes('matches') && comp.includes('disabled'),
  );
  await check('all 3 actions wired to server actions', () =>
    comp.includes('requestDataExport') &&
    comp.includes('hardResetDataModel') &&
    comp.includes('deleteOrg'),
  );

  console.log('\nPAGE');
  await check('danger page exists', () =>
    fs.existsSync('src/app/(dashboard)/settings/danger/page.tsx'),
  );
  await check('danger page guards non-admins', () => {
    const page = fs.readFileSync('src/app/(dashboard)/settings/danger/page.tsx', 'utf8');
    return page.includes('hasRole') && page.includes("redirect('/settings/profile')");
  });

  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ SETTINGS.6 PASSED — ${passed} checks`);
    console.log('⚠️  See docs/manual-checks.md for browser verification steps.\n');
  } else {
    console.log(`\n❌ SETTINGS.6 FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

verifySettings6();
