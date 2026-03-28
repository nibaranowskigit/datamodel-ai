import { db } from '@/lib/db';
import { syncLogs, udmFields, proposedFields, cdmRecords } from '@/lib/db/schema';
import { and, eq, gte, lt, count } from 'drizzle-orm';

export type DigestData = {
  orgId: string;
  weekStart: Date;
  weekEnd: Date;
  syncs: {
    total: number;
    succeeded: number;
    failed: number;
    sources: string[];
  };
  fields: {
    approvedThisWeek: number;
    pendingApproval: number;
    proposedThisWeek: number;
  };
  health: {
    currentScore: number | null;
    previousScore: number | null;
    delta: number | null;
  };
  hasActivity: boolean;
};

export async function buildDigestData(
  orgId: string,
  weekStart: Date,
  weekEnd: Date,
): Promise<DigestData> {

  // ─── Sync stats ──────────────────────────────────────────
  const syncsThisWeek = await db.query.syncLogs.findMany({
    where: and(
      eq(syncLogs.orgId, orgId),
      gte(syncLogs.startedAt, weekStart),
      lt(syncLogs.startedAt, weekEnd),
    ),
    columns: { status: true, sourceType: true },
  });

  const syncSucceeded = syncsThisWeek.filter((s) => s.status === 'success').length;
  // Sync failures are stored as 'error' in the enum (syncStatusEnum)
  const syncFailed    = syncsThisWeek.filter((s) => s.status === 'error').length;
  const sources = [...new Set(syncsThisWeek.map((s) => s.sourceType))];

  // ─── Field stats ─────────────────────────────────────────
  // Proposed fields live in udm_fields with lifecycle status column
  const approvedThisWeek = await db.query.udmFields.findMany({
    where: and(
      eq(udmFields.orgId, orgId),
      eq(udmFields.status, 'approved'),
      gte(udmFields.approvedAt, weekStart),
      lt(udmFields.approvedAt, weekEnd),
    ),
    columns: { id: true },
  });

  const [[{ value: udmPending }], [{ value: aiPending }]] = await Promise.all([
    db
      .select({ value: count() })
      .from(udmFields)
      .where(and(eq(udmFields.orgId, orgId), eq(udmFields.status, 'proposed'))),
    db
      .select({ value: count() })
      .from(proposedFields)
      .where(
        and(eq(proposedFields.orgId, orgId), eq(proposedFields.status, 'proposed')),
      ),
  ]);
  const pendingApprovalCount = udmPending + aiPending;

  const proposedThisWeek = await db.query.udmFields.findMany({
    where: and(
      eq(udmFields.orgId, orgId),
      gte(udmFields.createdAt, weekStart),
      lt(udmFields.createdAt, weekEnd),
    ),
    columns: { id: true },
  });

  // ─── Health score ─────────────────────────────────────────
  // Health score stored in CDM record's `data` JSONB field by S3.4.
  // Until S3.4 ships, currentScore is null and the health section is omitted.
  const currentCDM = await db.query.cdmRecords.findFirst({
    where: eq(cdmRecords.orgId, orgId),
    columns: { data: true },
  });

  const cdmData = currentCDM?.data as Record<string, unknown> | null | undefined;
  const currentScore = typeof cdmData?.health_score === 'number'
    ? cdmData.health_score
    : null;

  // Previous week score — wired in S3.4; null until that story ships
  const previousScore: number | null = null;

  const delta = currentScore !== null && previousScore !== null
    ? currentScore - previousScore
    : null;

  // ─── Has activity? ────────────────────────────────────────
  const hasActivity =
    syncsThisWeek.length > 0 ||
    approvedThisWeek.length > 0 ||
    proposedThisWeek.length > 0 ||
    pendingApprovalCount > 0;

  return {
    orgId,
    weekStart,
    weekEnd,
    syncs: {
      total:     syncsThisWeek.length,
      succeeded: syncSucceeded,
      failed:    syncFailed,
      sources,
    },
    fields: {
      approvedThisWeek: approvedThisWeek.length,
      pendingApproval:  pendingApprovalCount,
      proposedThisWeek: proposedThisWeek.length,
    },
    health: {
      currentScore,
      previousScore,
      delta,
    },
    hasActivity,
  };
}
