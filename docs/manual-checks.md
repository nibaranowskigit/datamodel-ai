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
