'use server';

import { db } from '@/lib/db';
import { udmFields } from '@/lib/db/schema';
import { getAuth } from '@/lib/auth';
import { requireRole } from '@/lib/roles';
import { validateFieldKey } from '@/lib/fields/validation';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// Approve a proposed field — transitions to production
export async function approveField(fieldId: string) {
  await requireRole('org:member');
  const { orgId, userId } = await getAuth();

  const field = await db.query.udmFields.findFirst({
    where: and(eq(udmFields.id, fieldId), eq(udmFields.orgId, orgId)),
  });

  if (!field) throw new Error('Field not found');
  if (field.status === 'production') throw new Error('Field is already in production');
  if (field.status === 'deprecated') throw new Error('Cannot approve a deprecated field');

  await db
    .update(udmFields)
    .set({
      status: 'production',
      approvedBy: userId,
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(udmFields.id, fieldId), eq(udmFields.orgId, orgId)));

  revalidatePath('/data-model/fields');
}

// Deprecate a field — never hard delete
export async function deprecateField(fieldId: string, supersededBy?: string) {
  await requireRole('org:member');
  const { orgId } = await getAuth();

  const field = await db.query.udmFields.findFirst({
    where: and(eq(udmFields.id, fieldId), eq(udmFields.orgId, orgId)),
  });

  if (!field) throw new Error('Field not found');
  if (field.status === 'deprecated') throw new Error('Field is already deprecated');

  await db
    .update(udmFields)
    .set({
      status: 'deprecated',
      supersededBy: supersededBy ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(udmFields.id, fieldId), eq(udmFields.orgId, orgId)));

  revalidatePath('/data-model/fields');
}

// Create a new proposed field (used by AI advisor in S2.0)
export async function createProposedField(input: {
  fieldKey: string;
  displayName: string;
  description?: string;
  typology: string;
  dataType: string;
  aiSuggested?: boolean;
  aiRationale?: string;
}) {
  await requireRole('org:member');
  const { orgId } = await getAuth();

  validateFieldKey(input.fieldKey);

  await db.insert(udmFields).values({
    orgId,
    fieldKey: input.fieldKey,
    displayName: input.displayName,
    description: input.description,
    typology: input.typology as typeof udmFields.$inferInsert['typology'],
    dataType: input.dataType as typeof udmFields.$inferInsert['dataType'],
    status: 'proposed',
    aiSuggested: input.aiSuggested ?? false,
    aiRationale: input.aiRationale,
  });

  revalidatePath('/data-model/fields');
}

// Update field — throws if trying to change field_key of a production field
export async function updateField(
  fieldId: string,
  updates: {
    displayName?: string;
    description?: string;
    fieldKey?: string;
  }
) {
  await requireRole('org:member');
  const { orgId } = await getAuth();

  const field = await db.query.udmFields.findFirst({
    where: and(eq(udmFields.id, fieldId), eq(udmFields.orgId, orgId)),
  });

  if (!field) throw new Error('Field not found');

  // field_key is immutable once production
  if (updates.fieldKey && updates.fieldKey !== field.fieldKey && field.status === 'production') {
    throw new Error(
      'field_key is immutable once a field is in production. Create a new field and deprecate this one.'
    );
  }

  if (updates.fieldKey) validateFieldKey(updates.fieldKey);

  await db
    .update(udmFields)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(udmFields.id, fieldId), eq(udmFields.orgId, orgId)));

  revalidatePath('/data-model/fields');
}
