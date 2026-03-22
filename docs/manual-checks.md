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
