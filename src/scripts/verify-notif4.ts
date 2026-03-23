// src/scripts/verify-notif4.ts
// Run: npm run verify src/scripts/verify-notif4.ts

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

  console.log('\n🔍 Verifying NOTIF.4 — Billing Notifications\n');

  const fs = await import('fs');

  console.log('FILES');
  await check('notify-billing.ts exists', () =>
    fs.existsSync('src/lib/notifications/notify-billing.ts')
  );

  console.log('\nHELPER');
  const helper = fs.readFileSync(
    'src/lib/notifications/notify-billing.ts', 'utf8'
  );
  await check('handles payment_success', () =>
    helper.includes('payment_success')
  );
  await check('handles payment_failed', () =>
    helper.includes('payment_failed')
  );
  await check('handles trial_ending', () =>
    helper.includes('trial_ending')
  );
  await check('handles subscription_cancelled', () =>
    helper.includes('subscription_cancelled')
  );
  await check("filters admins only — org:admin", () =>
    helper.includes("'org:admin'") || helper.includes('"org:admin"')
  );
  await check("calls notify() with billing type", () =>
    helper.includes("type: 'billing'")
  );
  await check('all CTAs link to /settings/billing', () =>
    helper.includes('/settings/billing')
  );

  console.log('\nWEBHOOK INTEGRATION');
  const webhookPath = 'src/app/api/webhooks/stripe/route.ts';
  await check('stripe webhook route exists', () => fs.existsSync(webhookPath));
  if (fs.existsSync(webhookPath)) {
    const webhook = fs.readFileSync(webhookPath, 'utf8');
    await check('handles invoice.payment_succeeded', () =>
      webhook.includes('invoice.payment_succeeded')
    );
    await check('handles invoice.payment_failed', () =>
      webhook.includes('invoice.payment_failed')
    );
    await check('handles customer.subscription.trial_will_end', () =>
      webhook.includes('trial_will_end')
    );
    await check('handles customer.subscription.deleted', () =>
      webhook.includes('subscription.deleted')
    );
    await check('calls notifyBilling in webhook', () =>
      webhook.includes('notifyBilling')
    );
  }

  console.log('\nSCHEMA');
  const orgsSchema = fs.readFileSync('src/lib/db/schema/orgs.ts', 'utf8');
  await check('orgs schema has stripeCustomerId', () =>
    orgsSchema.includes('stripeCustomerId') || orgsSchema.includes('stripe_customer_id')
  );

  const migrationFiles = fs.readdirSync('drizzle');
  await check('migration for stripe_customer_id exists', () =>
    migrationFiles.some((f: string) => {
      if (!f.endsWith('.sql')) return false;
      const content = fs.readFileSync(`drizzle/${f}`, 'utf8');
      return content.includes('stripe_customer_id');
    })
  );

  console.log('\n' + '─'.repeat(40));
  if (failed === 0) {
    console.log(`\n✅ NOTIF.4 PASSED — ${passed} checks`);
    console.log('⚠️  See docs/manual-checks.md for browser verification steps.\n');
  } else {
    console.log(`\n❌ NOTIF.4 FAILED — ${failed} check(s) failed\n`);
    process.exit(1);
  }
}

run();
