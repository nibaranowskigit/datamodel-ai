// src/scripts/verify-infra1.ts
// Run: npm run verify src/scripts/verify-infra1.ts

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

  console.log('\n🔍 Verifying INFRA.1 — GitHub + Vercel\n');

  const { execSync } = await import('child_process');
  const fs = await import('fs');

  console.log('GIT');
  await check('git repo initialized', () => fs.existsSync('.git'));
  await check('git remote origin set to GitHub', () => {
    try {
      const remote = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
      return remote.includes('github.com');
    } catch { return false; }
  });
  await check('.env.local in .gitignore', () => {
    const gitignore = fs.readFileSync('.gitignore', 'utf8');
    return gitignore.includes('.env.local') || gitignore.includes('.env*') || gitignore.includes('.env');
  });
  await check('node_modules in .gitignore', () => {
    const gitignore = fs.readFileSync('.gitignore', 'utf8');
    return gitignore.includes('node_modules');
  });

  console.log('\nVERCEL CONFIG');
  await check('vercel.json exists', () => fs.existsSync('vercel.json'));
  await check('vercel.json has cron for /api/cron/sync-all', () => {
    if (!fs.existsSync('vercel.json')) return false;
    const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
    return config.crons?.some((c: { path: string }) => c.path === '/api/cron/sync-all');
  });

  console.log('\nBUILD');
  await check('npm run build passes', () => {
    try {
      execSync('npm run build', { stdio: 'pipe', timeout: 120000 });
      return true;
    } catch { return false; }
  });

  console.log('\nENV VARS (local)');
  const required = [
    'DATABASE_URL',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    'ANTHROPIC_API_KEY',
    'INNGEST_EVENT_KEY',
    'INNGEST_SIGNING_KEY',
    'ENCRYPTION_KEY',
    'CRON_SECRET',
    'NEXT_PUBLIC_APP_URL',
  ];
  for (const key of required) {
    await check(`${key} set`, () => !!process.env[key]);
  }

  console.log('\nCURSORRULES');
  await check('.cursorrules has git workflow section', () => {
    const rules = fs.readFileSync('.cursorrules', 'utf8');
    return rules.toLowerCase().includes('git') && rules.toLowerCase().includes('commit');
  });

  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ INFRA.1 PASSED — ${passed} checks`);
    console.log('⚠️  Manually verify:');
    console.log('    - Production URL loads at your Vercel domain');
    console.log('    - Vercel deployment logs show no errors');
    console.log('    - Clerk webhook updated to production URL');
    console.log('    - Inngest synced to production\n');
  } else {
    console.log(`\n❌ INFRA.1 FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
