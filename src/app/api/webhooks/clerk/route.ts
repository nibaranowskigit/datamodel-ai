import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orgs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'No webhook secret' }, { status: 500 });
  }

  const headersList = await headers();
  const svix_id = headersList.get('svix-id');
  const svix_timestamp = headersList.get('svix-timestamp');
  const svix_signature = headersList.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: any;
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const { type, data } = evt;

  if (type === 'organization.created') {
    const pendingPlan = data.public_metadata?.pendingPlan ?? 'free';
    const validPlans = ['free', 'starter', 'growth'];
    const plan = validPlans.includes(pendingPlan) ? pendingPlan : 'free';

    await db.insert(orgs).values({
      id: data.id,
      clerkOrgId: data.id,
      name: data.name,
      plan: plan as 'free' | 'starter' | 'growth',
      status: 'active',
    }).onConflictDoNothing();
  }

  if (type === 'organization.updated') {
    await db
      .update(orgs)
      .set({ name: data.name, updatedAt: new Date() })
      .where(eq(orgs.clerkOrgId, data.id));
  }

  if (type === 'organization.deleted') {
    await db
      .update(orgs)
      .set({ status: 'inactive', updatedAt: new Date() })
      .where(eq(orgs.clerkOrgId, data.id));
  }

  return NextResponse.json({ received: true });
}
