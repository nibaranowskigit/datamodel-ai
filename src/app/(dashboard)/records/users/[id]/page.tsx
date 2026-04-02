import { orgGuard } from '@/lib/auth';
import { db } from '@/lib/db';
import { udmRecords, udmFields, udmFieldValues } from '@/lib/db/schema';
import { and, eq, ne } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { Record360View } from '@/components/records/record-360-view';
import Link from 'next/link';

export default async function RecordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { orgId } = await orgGuard();

  const record = await db.query.udmRecords.findFirst({
    where: and(eq(udmRecords.id, id), eq(udmRecords.orgId, orgId)),
  });

  if (!record) notFound();

  const [approvedFieldDefs, fieldValueRows] = await Promise.all([
    db.query.udmFields.findMany({
      where: and(
        eq(udmFields.orgId, orgId),
        eq(udmFields.status, 'production'),
        ne(udmFields.typology, 'COMP'),
      ),
      columns: {
        fieldKey: true,
        displayName: true,
        dataType: true,
        description: true,
      },
    }),
    db.query.udmFieldValues.findMany({
      where: and(eq(udmFieldValues.recordId, id), eq(udmFieldValues.orgId, orgId)),
      columns: {
        fieldKey: true,
        value: true,
        sourceType: true,
      },
    }),
  ]);

  const fieldDefMap = Object.fromEntries(
    approvedFieldDefs.map((f) => [
      f.fieldKey,
      {
        fieldKey: f.fieldKey,
        label: f.displayName,
        dataType: f.dataType,
        description: f.description,
      },
    ]),
  );

  const dataObj = (record.data ?? {}) as Record<string, unknown>;
  const fields: Record<string, unknown> = { ...dataObj };
  const fieldSources: Record<string, string> = {};

  for (const fv of fieldValueRows) {
    fields[fv.fieldKey] = fv.value;
    fieldSources[fv.fieldKey] = fv.sourceType;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/records" className="hover:text-foreground transition-colors duration-150">
          Records
        </Link>
        <span>/</span>
        <span className="text-foreground truncate">{record.email ?? record.id}</span>
      </div>

      <Record360View
        record={{
          id: record.id,
          email: record.email,
          aliasOfId: record.aliasOfId,
          fields,
        }}
        fieldDefMap={fieldDefMap}
        fieldSources={fieldSources}
      />
    </div>
  );
}
