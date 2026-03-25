import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { UserProfileForm } from '@/components/settings/user-profile-form';

export default async function PersonalProfilePage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">Your profile</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your personal account details.
        </p>
      </div>
      <UserProfileForm
        firstName={user.firstName ?? ''}
        lastName={user.lastName ?? ''}
        email={user.primaryEmailAddress?.emailAddress ?? ''}
        imageUrl={user.imageUrl}
      />
    </div>
  );
}
