'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

export async function updateUserProfile(input: {
  firstName: string;
  lastName: string;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  if (!input.firstName.trim()) throw new Error('First name cannot be empty.');

  const client = await clerkClient();
  await client.users.updateUser(userId, {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
  });

  revalidatePath('/settings/me');
}
