// FILE LOCATION: app/account/profile/page.tsx
// Put this file at app/account/profile/page.tsx in your project root (or src/app/account/profile/page.tsx if your project has a src/ folder).

import { getAccountContext } from '@/app/lib/account';
import { ProfileForm } from '@/components/account/ProfileForm';
import { PageHeader } from '@/components/account/ui';

export default async function ProfilePage() {
  const { user, profile } = await getAccountContext();

  return (
    <>
      <PageHeader title="Profile" description="How you appear to hosts and guests." />
      <ProfileForm
        userId={user.id}
        email={user.email ?? ''}
        fullName={profile.full_name}
        phone={profile.phone}
        avatarUrl={profile.avatar_url}
        isHost={profile.role === 'host'}
        businessName={profile.business_name}
        hostBio={profile.host_bio}
        // Only the last four digits ever reach the browser.
        idNumberLast4={profile.id_number ? profile.id_number.slice(-4) : null}
      />
    </>
  );
}