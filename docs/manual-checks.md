# Manual Checks

Automated verify scripts catch static correctness. These checks require a live browser, real email, or Inngest UI.
Mark each item `[x]` when confirmed in production or local dev.

---

## INFRA.1 — Production Deploy

- [ ] Production URL loads at your Vercel domain
- [ ] Vercel deployment logs show no errors
- [ ] Clerk webhook updated to production URL
- [ ] Inngest synced to production

---

## S0.7 — Cron / Inngest Sync Job

- [ ] Trigger cron → Inngest dev UI shows job run → records appear in Supabase

---

## AUTH.5 — Email Verification

- [ ] Password reset email received + reset completes
- [ ] New sign-up → verification email received
- [ ] Unverified user blocked from accessing app

---

## USER.1 — Invite Flow

- [ ] Send invite → email received → accept → land in org
- [ ] Revoke invite → link no longer works
- [ ] Non-Admin cannot see invite form

---

## USER.2 — Role Model

- [ ] Viewer calling `approveField` → Forbidden error
- [ ] Member calling `inviteMember` → Forbidden error
- [ ] Admin calling both → passes

---

## USER.3 — Remove Member

- [ ] Remove a member → they lose access
- [ ] Remove self attempt → blocked
- [ ] Remove last admin → blocked

---

## USER.4 — Pending Invites UI

- [ ] Resend → success feedback appears for 3s
- [ ] Revoke → two-step confirm → invite removed immediately
- [ ] Click "No" → nothing changes
- [ ] No pending invites → empty state shown
- [ ] Expired invite → Expired badge visible
- [ ] Non-Admin → pending invites section hidden

---

## USER.5 — Invite Acceptance

- [ ] Send real invite → accept as NEW user → lands on `/dashboard` in correct org
- [ ] Send real invite → accept as EXISTING user → lands on `/dashboard` in correct org
- [ ] Role on `/dashboard` matches role set at invite time
- [ ] Expired invite → `/invite-expired` with clear message
- [ ] Already-member clicks old invite → redirected to `/dashboard`

---

## SETTINGS.1 — Settings Shell

- [ ] `/settings` redirects to `/settings/profile`
- [ ] Active nav item highlighted on each route
- [ ] Non-admin cannot access `/settings/danger`

---

## SETTINGS.2 — Org Profile Settings

- [ ] Visit `/settings/profile` as Admin — org name, business type, vertical, and stage are pre-filled with current values
- [ ] Update org name → save → confirm new name appears in DB and in Clerk dashboard org switcher
- [ ] Change vertical → save → confirm `orgs.vertical` updated in DB
- [ ] Change stage → save → confirm `orgs.stage` updated in DB
- [ ] Change business type B2B → B2C → inline warning appears, vertical resets to placeholder
- [ ] Save B2C business type → confirm `orgs.business_type` is `b2c` in DB
- [ ] Visit `/settings/profile` as non-Admin (org:member or org:viewer) → read-only card shown, no form controls, "Contact an Admin to make changes." visible
- [ ] "Changes saved." confirmation appears for ~3 seconds after successful save
- [ ] Save button disabled when no fields have changed (isDirty = false)
- [ ] Submit with empty org name → error "Org name cannot be empty." shown inline

---

## SETTINGS.3 — Connected Sources Management

- [ ] `/settings/sources` loads without error
- [ ] All connected sources visible with correct status badges (Active/Pending/Error)
- [ ] Error source shows red badge and error message text
- [ ] Last sync time shown as relative time ("2h ago" / "Never")
- [ ] Disconnect button triggers two-step confirmation ("Sure? Yes No")
- [ ] After confirming disconnect — source disappears from list
- [ ] Reconnect button visible on Error/Pending sources (Admin only)
- [ ] Reconnect form expands inline with correct credential fields for that source type
- [ ] After saving reconnect credentials — status resets to Pending
- [ ] Non-Admin sees list but no Disconnect/Reconnect buttons
- [ ] Empty state shown when no sources connected
- [ ] connectionConfig never visible in browser DevTools network tab

---

## SETTINGS.4 — Notification Preferences

- [ ] /settings/notifications loads without error
- [ ] All 4 notification types visible with toggles
- [ ] Sync failures: ON by default
- [ ] Field approvals: ON by default
- [ ] Billing alerts: ON by default
- [ ] Weekly digest: OFF by default
- [ ] Toggling a switch saves immediately — no Save button needed
- [ ] Reload page — toggled preferences persist correctly
- [ ] "Settings apply to your account only" copy visible
- [ ] Switch component renders correctly in dark mode

---

## SETTINGS.5 — API Keys Management

- [ ] /settings/api-keys loads without error
- [ ] "Create key" form visible for Admin, hidden for non-Admin
- [ ] Create a key → one-time modal opens with full key visible
- [ ] "Done" button disabled until "I've copied this key" checkbox checked
- [ ] After closing modal — key only shows prefix in list (dm_live_xxxx…)
- [ ] keyHash never visible in browser DevTools network tab
- [ ] "Never used" shown for newly created keys
- [ ] Rotate button → old key gone → new modal with new key prefix
- [ ] Revoke triggers two-step confirmation ("Sure? Yes No")
- [ ] After revoke confirmed — key disappears from list
- [ ] Non-Admin sees key list but no Create/Rotate/Revoke buttons
- [ ] Empty state shows correct message for Admin vs non-Admin

---

## SETTINGS.6 — Danger Zone

- [ ] /settings/danger loads for Admin without error
- [ ] Non-Admin visiting /settings/danger gets redirected to /settings/profile
- [ ] All three action cards visible with descriptions
- [ ] Clicking "Export data" expands the card with confirmation input
- [ ] "Export data" button disabled until "export data" is typed exactly
- [ ] After confirming export — "Export requested. Check your email" message shown
- [ ] Export email received with JSON attachment within 2 minutes
- [ ] JSON export contains org, cdmRecords, udmRecords, syncLogs
- [ ] Clicking "Hard reset" requires typing "reset data model"
- [ ] After hard reset — CDM/UDM records gone, sources and API keys intact
- [ ] Clicking "Delete organisation" requires typing "delete my org"
- [ ] After delete org — redirected to /create-org, all data gone
- [ ] Confirmation input is case-insensitive ("Export Data" also works)
- [ ] Only one action card expanded at a time

---

## DESIGN.3 — Form Vertical Alignment

- [ ] /settings/team — invite form: email label and role label tops are flush
- [ ] /settings/team — invite form: input, select, button bottoms are flush
- [ ] /settings/api-keys — key name input and create button fully aligned
- [ ] DevTools: invisible label has visibility:hidden, not display:none (takes up space)
- [ ] No inline form has a floating button above or below the input baseline

---

## SETTINGS.7 — User Avatar + Profile + Sign Out

- [ ] Avatar button visible in top-right corner of dashboard on every page
- [ ] Clicking avatar opens dropdown with full name + email
- [ ] Dropdown shows "Your profile" link and "Sign out" button
- [ ] "Your profile" navigates to /settings/me
- [ ] "Sign out" logs out and redirects to /sign-in
- [ ] Clicking outside dropdown closes it
- [ ] Pressing Escape closes dropdown
- [ ] /settings/me shows avatar (or initials fallback), name, read-only email
- [ ] Updating first/last name saves and reflects in avatar dropdown immediately
- [ ] No Clerk avatar set → initials shown in button

---

## NOTIF.1 — Notification Infrastructure

- [ ] Test notify() call from Inngest → email received in inbox
- [ ] Email renders correctly: dark background, Datamodel.ai header, teal CTA button
- [ ] "Manage preferences" link in email footer points to /settings/notifications
- [ ] In-app notification record created in DB after notify() call
- [ ] shouldNotify() = false → no email sent AND no DB record created
- [ ] All 4 template types render without errors (sync_failure, field_approval, billing, weekly_digest)
- [ ] RESEND_API_KEY set in both .env.local and Vercel env vars
- [ ] Emails sent from notifications@datamodel.ai (not test address)

---

## NOTIF.2 — Sync Failure Alerts

- [ ] Trigger a sync failure (use invalid API key on a connected source)
- [ ] Email received within 60 seconds of failure
- [ ] Email subject contains the source name (e.g. "HubSpot sync failed")
- [ ] Email body contains the actual error message
- [ ] Email CTA links to /settings/sources
- [ ] In-app notification record visible in DB (notifications table)
- [ ] Toggle sync_failure OFF for test user → re-trigger failure → no email received
- [ ] Inngest retry of same sync job → no duplicate email (dedup working)

---

## NOTIF.3 — Field Approval Needed

- [ ] Trigger AI proposal run with new fields → email received within 60s
- [ ] Email subject includes field count and source name
- [ ] Email body describes what needs reviewing
- [ ] Email CTA links to /data-model/fields
- [ ] In-app notification record created in DB
- [ ] Run with 0 new proposals → no email fired
- [ ] Toggle field_approval OFF → re-trigger → no email received
- [ ] Inngest retry of same proposal run → no duplicate email

---

## NOTIF.4 — Billing Notifications

- [ ] stripe trigger invoice.payment_succeeded → Admin receives payment confirmation email
- [ ] Payment success email shows correct amount and card last 4
- [ ] stripe trigger invoice.payment_failed → Admin receives payment failed email
- [ ] Payment failed email shows failure reason and links to /settings/billing
- [ ] stripe trigger customer.subscription.trial_will_end → trial ending email received
- [ ] Trial ending email shows correct days remaining
- [ ] stripe trigger customer.subscription.deleted → cancellation email received
- [ ] Non-Admin member in same org receives NO billing emails
- [ ] Admin with billing notifications OFF receives nothing
- [ ] All billing emails CTA links correctly to /settings/billing
- [ ] In-app notification record created in DB for each event

---

## NOTIF.5 — Weekly Digest

- [ ] Trigger cron manually via Inngest dev server — digest fires
- [ ] Email received for opted-in member (weekly_digest = true)
- [ ] Email contains sync run summary (count + success/fail split)
- [ ] Email contains field approval counts (approved + pending)
- [ ] Email contains health score if available (omitted if null / S3.4 not done)
- [ ] No email sent when hasActivity = false (zero syncs + zero field changes)
- [ ] Member with weekly_digest = false receives nothing
- [ ] Digest skipped for org with no activity last 7 days
- [ ] "Review now" link in email points to /data-model/fields when fields pending
- [ ] In-app notification record created in DB for each opted-in member

---

## S1.1 — Stripe Connector

- [ ] Connect Stripe via /settings/sources with test secret key — status shows Pending
- [ ] Trigger sync — status changes to Active
- [ ] UDM records visible with FIN_ fields populated
- [ ] FIN_mrr, FIN_subscription_status, FIN_plan_name all have values
- [ ] Customer with no subscription → FIN_ fields null (record still exists)
- [ ] CDM shows FIN_total_mrr and FIN_active_subscribers (B2B orgs only)
- [ ] Stripe customer with matching HubSpot email → single UDM record with both HS_ and FIN_ fields
- [ ] Invalid API key → testConnection returns error, sync does not proceed
- [ ] Sync log written to DB after run
- [ ] Org with > 100 Stripe customers — all pages synced (autoPagingEach)

---

## S1.2 — Intercom Connector

- [ ] Connect Intercom via /settings/sources with access token — status shows Pending
- [ ] Trigger sync — status changes to Active
- [ ] UDM records show SUP_open_tickets, SUP_csat_score, SUP_last_contact_date
- [ ] Contact with no conversations → SUP_ fields are 0 or null (no crash)
- [ ] Contact matched by email to existing HubSpot/Stripe UDM record
- [ ] Fused UDM record has HS_ + FIN_ + SUP_ fields on same record
- [ ] CDM shows SUP_avg_csat and SUP_total_open_tickets
- [ ] Invalid access token → testConnection returns error, sync does not proceed
- [ ] Sync log written to DB after run
- [ ] Org with > 150 contacts — all pages synced (cursor-based pagination)

---

## S1.3 — Mixpanel Connector

- [ ] Connect Mixpanel via /settings/sources — status shows Pending
- [ ] Trigger sync — status changes to Active
- [ ] UDM records show PROD_last_seen, PROD_activated, PROD_session_count_30d
- [ ] PROD_days_since_last_seen correctly computed (e.g. 3 days ago = 3)
- [ ] Profile with no email skipped — logged in sync errors, no crash
- [ ] Profile with no $last_seen → PROD_last_seen null (no crash)
- [ ] activationEvent configured → PROD_activated true/false populated
- [ ] activationEvent blank → PROD_activated null for all records
- [ ] CDM shows PROD_mau, PROD_dau, PROD_activation_rate
- [ ] Fused UDM record: user@acme.com has HS_ + FIN_ + SUP_ + PROD_ fields
- [ ] Invalid credentials → testConnection fails with error in /settings/sources
- [ ] Sync log written to DB after run
- [ ] Org with > 1000 Mixpanel profiles — all pages synced (session_id pagination)

---

## S1.4 — Multi-Source Orchestration

- [ ] Send `org/sync.requested` event manually → all active sources fan out in parallel
- [ ] Inngest dashboard shows parallel source steps running simultaneously
- [ ] One source with invalid creds → that source errors, others complete successfully
- [ ] `sync_runs` row created with `status = 'running'` at start of sync
- [ ] `sync_runs` row updated to `'completed'` / `'partial'` / `'failed'` after all sources settle
- [ ] `sync_logs` rows written per source, each linked to `sync_run_id`
- [ ] Reconciliation step fires after all sources settle (not mid-fan-out)
- [ ] Field proposals generated after reconciliation completes
- [ ] `/settings/sources` shows correct per-source status after a mixed result (partial)
- [ ] Old per-source `syncSourceJob` still appears in Inngest dashboard (preserved for manual triggers)
- [ ] `orchestrateSync` cron appears in Inngest dashboard as `orchestrate-sync`
- [ ] `syncOrgSources` function appears in Inngest dashboard as `sync-org-sources`

---

## S1.5 — Reconciliation Engine

- [ ] Run full multi-source sync — `reconcileUDMRecords()` called after fan-out
- [ ] UDM record for matched email has field values from all 4 sources merged on primary record
- [ ] "Acme Corp" (HubSpot) and "ACME CORP" (Intercom) — NOT flagged as conflict
- [ ] "Acme Corp" (HubSpot) and "Acme Inc" (Intercom) — IS flagged as conflict
- [ ] `cdm_conflicts` table has rows after sync with real data
- [ ] `/conflicts` page loads and shows unresolved conflicts
- [ ] Conflict shows both values + source labels
- [ ] Clicking "Use this" resolves conflict — disappears from list
- [ ] Resolved conflict writes correct value to UDM field value on master record
- [ ] `reconciliation_rules` seeded for new org — all 4 namespaces present
- [ ] HubSpot wins on `HS_` fields by default (priority 1)
- [ ] Stripe wins on `FIN_` fields by default (priority 1)
- [ ] Open conflict count appears on sidebar (Conflicts) and dashboard stat when conflicts exist
- [ ] `/settings/sources` shows destructive badge linking to `/conflicts` when count > 0
- [ ] `/settings/reconciliation` lists per-namespace priority; admin can change ranks and save — next sync uses new winners

---

## S1.6 — Identity Resolution

- [ ] Run full sync — identity resolution fires after reconciliation
- [ ] Two records with same email → auto-merged (`alias_of_id` set on one)
- [ ] Two records, same domain + name → auto-merged (confidence 0.85 ≥ threshold)
- [ ] Two records, same domain only → appear in `/identity` review queue (confidence 0.5)
- [ ] `/identity` page loads — pending review items visible
- [ ] Each review item shows both email addresses + sources
- [ ] Click "Merge these records" → records merged → item disappears from queue
- [ ] Click "Keep separate" → item disappears + never shown again on next sync
- [ ] Merged record (primary) has fields from both sources
- [ ] Alias record has `alias_of_id` pointing to primary
- [ ] Agent cannot see alias records — only primary resolved records
- [ ] Gmail/Yahoo domains never trigger domain-only match

---

## S2.0 — AI Field Proposal Engine

- [ ] Run full sync cycle → `proposeFields()` fires after reconciliation
- [ ] New proposals appear in `proposed_fields` table
- [ ] `/data-model/fields` lists AI proposals with evidence, Approve, and Reject
- [ ] Approve promotes row to `udm_fields` with status production and clears the queue row
- [ ] Each proposal has fieldKey, label, dataType, description, sourceEvidence
- [ ] Proposals have sensible field keys in NAMESPACE_snake_case format
- [ ] Run sync again → no duplicate proposals created (idempotent)
- [ ] B2B org → CDM proposals also generated (model_type = 'cdm')
- [ ] B2C org → no CDM proposals, only UDM proposals
- [ ] NOTIF.3 fires after proposals → "N new fields need your approval" → CTA `/data-model/fields`
- [ ] Max 20 proposals per sync run enforced
- [ ] Claude API error on one namespace → other namespaces still propose
- [ ] `/fields` redirects to `/data-model/fields` (legacy email links)
