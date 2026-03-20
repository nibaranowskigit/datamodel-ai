import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dataSources } from '@/lib/db/schema';
import { ne } from 'drizzle-orm';
import { inngest } from '@/lib/inngest/client';
import type { DatamodelEvents } from '@/lib/inngest/events';

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const activeSources = await db.query.dataSources.findMany({
    where: ne(dataSources.status, 'inactive'),
  });

  if (activeSources.length === 0) {
    return NextResponse.json({ triggered: 0 });
  }

  const events: DatamodelEvents[] = activeSources.map((source) => ({
    name: 'sync/source.requested' as const,
    data: {
      orgId: source.orgId,
      sourceId: source.id,
      sourceType: source.sourceType,
    },
  }));

  await inngest.send(events);

  return NextResponse.json({
    triggered: events.length,
    sources: activeSources.map((s) => ({
      orgId: s.orgId,
      sourceType: s.sourceType,
    })),
  });
}
