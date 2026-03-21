import { auth } from '@clerk/nextjs/server';

// ─── Types ────────────────────────────────────────────────
export type OrgRole = 'org:admin' | 'org:member' | 'org:viewer';

// ─── Hierarchy — higher number = more access ──────────────
const ROLE_HIERARCHY: Record<OrgRole, number> = {
  'org:admin':  3,
  'org:member': 2,
  'org:viewer': 1,
};

// ─── Get current user's role ──────────────────────────────
export async function getRole(): Promise<OrgRole | null> {
  const { orgRole } = await auth();
  return (orgRole as OrgRole) ?? null;
}

// ─── Enforce minimum role in server actions ───────────────
// Throws if caller's role is insufficient.
// Call at the TOP of every server action that mutates data.
export async function requireRole(minimum: OrgRole): Promise<void> {
  const { orgId, userId, orgRole } = await auth();

  if (!orgId || !userId) {
    throw new Error('Unauthorized');
  }

  const role = orgRole as OrgRole | null;

  if (!role) {
    throw new Error('Forbidden — no role assigned');
  }

  if (ROLE_HIERARCHY[role] < ROLE_HIERARCHY[minimum]) {
    throw new Error(
      `Forbidden — requires ${minimum}, current role is ${role}`
    );
  }
}

// ─── Check role for conditional UI ───────────────────────
// Use in Server Components to show/hide UI elements.
// Does NOT throw — returns boolean.
export async function hasRole(minimum: OrgRole): Promise<boolean> {
  const { orgRole } = await auth();
  if (!orgRole) return false;
  const role = orgRole as OrgRole;
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minimum];
}

// ─── Shorthands ───────────────────────────────────────────
export async function requireAdmin(): Promise<void> {
  return requireRole('org:admin');
}

export async function requireMember(): Promise<void> {
  return requireRole('org:member');
}
