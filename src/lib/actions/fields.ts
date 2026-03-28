'use server';

import { db } from '@/lib/db';
import { udmFields, proposedFields } from '@/lib/db/schema';
import { getAuth } from '@/lib/auth';
import { requireRole } from '@/lib/roles';
import { validateFieldKey } from '@/lib/fields/validation';
import {
  inferTypologyFromProposal,
  mapProposalDataTypeToUdm,
} from '@/lib/fields/promote-from-proposal';
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

/** Promote an S2.0 AI row from proposed_fields into udm_fields (production). */
export async function approveAiFieldProposal(proposedFieldId: string) {
  await requireRole('org:member');
  const { orgId, userId } = await getAuth();

  const row = await db.query.proposedFields.findFirst({
    where: and(
      eq(proposedFields.id, proposedFieldId),
      eq(proposedFields.orgId, orgId),
      eq(proposedFields.status, 'proposed'),
    ),
  });
  if (!row) throw new Error('Proposal not found or already handled');

  const existing = await db.query.udmFields.findFirst({
    where: and(eq(udmFields.orgId, orgId), eq(udmFields.fieldKey, row.fieldKey)),
  });
  if (existing) throw new Error('This field already exists in the registry');

  const ev = row.enumValues ?? [];
  const enumNote =
    row.dataType === 'enum' && ev.length > 0 ? ` Allowed values: ${ev.join(', ')}.` : '';
  const aiRationale = `${row.rationale}${enumNote}`.slice(0, 4000);

  await db.transaction(async (tx) => {
    await tx.insert(udmFields).values({
      orgId,
      fieldKey:      row.fieldKey,
      displayName:   row.label,
      description:   row.description,
      typology:      inferTypologyFromProposal(row.fieldKey, row.modelType),
      dataType:      mapProposalDataTypeToUdm(row.dataType),
      status:        'production',
      aiSuggested:   true,
      aiRationale,
      approvedBy:    userId,
      approvedAt:    new Date(),
    });
    const cleared = await tx
      .delete(proposedFields)
      .where(
        and(
          eq(proposedFields.id, proposedFieldId),
          eq(proposedFields.orgId, orgId),
          eq(proposedFields.status, 'proposed'),
        ),
      )
      .returning({ id: proposedFields.id });
    if (cleared.length === 0) throw new Error('Proposal was updated by another request');
  });

  revalidatePath('/data-model/fields');
  revalidatePath('/dashboard');
}

/** Dismiss AI queue row — removed so a future sync can propose the key again (unique is on org_id + field_key). */
export async function rejectAiFieldProposal(proposedFieldId: string) {
  await requireRole('org:member');
  const { orgId } = await getAuth();

  const removed = await db
    .delete(proposedFields)
    .where(
      and(
        eq(proposedFields.id, proposedFieldId),
        eq(proposedFields.orgId, orgId),
        eq(proposedFields.status, 'proposed'),
      ),
    )
    .returning({ id: proposedFields.id });

  if (removed.length === 0) throw new Error('Proposal not found or already handled');

  revalidatePath('/data-model/fields');
  revalidatePath('/dashboard');
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
