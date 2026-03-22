'use server';

import { db } from '@/lib/db';
import { orgs } from '@/lib/db/schema';
import { getAuth } from '@/lib/auth';
import { requireRole } from '@/lib/roles';
import { clerkClient } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function updateOrgProfile(input: {
  name: string;
  businessType: 'b2b' | 'b2c';
  vertical: string;
  stage: string;
}) {
  await requireRole('org:admin');
  const { orgId } = await getAuth();

  if (!input.name.trim()) throw new Error('Org name cannot be empty.');
  if (input.name.length > 64) throw new Error('Org name must be 64 characters or less.');

  await db
    .update(orgs)
    .set({
      name:         input.name.trim(),
      businessType: input.businessType,
      vertical:     input.vertical,
      stage:        input.stage,
      updatedAt:    new Date(),
    })
    .where(eq(orgs.id, orgId));

  try {
    const client = await clerkClient();
    await client.organizations.updateOrganization(orgId, {
      name: input.name.trim(),
    });
  } catch (err) {
    console.error('[settings] Clerk org name sync failed:', err);
  }

  revalidatePath('/settings/profile');
}
