import { db } from '@/lib/db';
import { udmFields } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

// Used by agent API in S3.1 — only ever returns production fields
// Enforced at DB query layer — never filtered in application code
export async function getProductionUdmFields(orgId: string) {
  return db.query.udmFields.findMany({
    where: and(
      eq(udmFields.orgId, orgId),
      eq(udmFields.status, 'production') // DB layer enforcement
    ),
    with: {
      sources: true,
    },
  });
}

// Used by field registry UI — returns all fields for human review
export async function getAllUdmFields(orgId: string) {
  return db.query.udmFields.findMany({
    where: eq(udmFields.orgId, orgId),
    with: {
      sources: true,
      versions: true,
    },
    orderBy: (fields, { desc }) => [desc(fields.createdAt)],
  });
}

// Used by approval UI — returns only proposed fields
export async function getProposedUdmFields(orgId: string) {
  return db.query.udmFields.findMany({
    where: and(
      eq(udmFields.orgId, orgId),
      eq(udmFields.status, 'proposed')
    ),
  });
}
