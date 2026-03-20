'use server';

import { db } from '@/lib/db';
import { orgs } from '@/lib/db/schema';
import { getAuth } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { clerkClient } from '@clerk/nextjs/server';

export async function saveBusinessType(formData: {
  businessType: 'b2b' | 'b2c';
  vertical: string;
  stage: string;
}) {
  const { orgId } = await getAuth();

  let org = await db.query.orgs.findFirst({
    where: eq(orgs.id, orgId),
  });

  if (org?.businessType) {
    redirect('/dashboard');
  }

  // Webhook may have missed org creation in local dev — upsert from Clerk
  if (!org) {
    const clerk = await clerkClient();
    const clerkOrg = await clerk.organizations.getOrganization({ organizationId: orgId });
    await db.insert(orgs).values({
      id: orgId,
      clerkOrgId: orgId,
      name: clerkOrg.name,
      plan: 'free',
      status: 'active',
    }).onConflictDoNothing();
  }

  await db
    .update(orgs)
    .set({
      businessType: formData.businessType,
      vertical: formData.vertical,
      stage: formData.stage,
      updatedAt: new Date(),
    })
    .where(eq(orgs.id, orgId));

  revalidatePath('/onboarding');
  revalidatePath('/onboarding/connect');
  redirect('/onboarding/connect');
}
