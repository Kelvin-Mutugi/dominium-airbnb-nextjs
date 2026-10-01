// FILE LOCATION: app/account/profile/page.tsx
// Put this file at app/account/profile/page.tsx in your project root (or src/app/account/profile/page.tsx if your project has a src/ folder).

import { getAccountContext } from '@/app/lib/account';
import { formatDate } from '@/app/lib/format';
import { AccountSignOutButton } from '@/components/account/AccountSignOutButton';
import { ProfileForm } from '@/components/account/ProfileForm';
import { PageHeader, Section } from '@/components/account/ui';

export default async function ProfilePage() {
  const { user, profile } = await getAccountContext();
  const isHost = profile.role === 'host';
  const verificationTitle = isHost
    ? profile.host_verified_at
      ? 'Host verified'
      : profile.kyc_status === 'pending'
        ? 'Host verification in review'
        : profile.kyc_status === 'rejected'
          ? 'Host verification needs an update'
          : 'Host verification not complete'
    : user.email_confirmed_at
      ? 'Email verified'
      : 'Email not verified yet';
  const verificationDescription = isHost
    ? profile.host_verified_at
      ? `Your host account was verified ${formatDate(profile.host_verified_at, 'long')}.`
      : profile.kyc_status === 'pending'
        ? 'Your host application is being reviewed.'
        : profile.kyc_status === 'rejected'
          ? profile.kyc_rejection_reason ?? 'Update your host application to continue verification.'
          : 'Complete host verification to activate your hosting account.'
    : user.email_confirmed_at
      ? 'Your sign-in email has been confirmed.'
      : 'Check your inbox for the email verification link.';

  return (
    <>
      <PageHeader title="Profile" description="How you appear to hosts and guests." />
      <Section title="Verification status" description="Your account verification at a glance.">
        <div className="account-neu-inset rounded-2xl p-4">
          <p className="font-semibold text-[#1B1A2E]">{verificationTitle}</p>
          <p className="mt-1 text-sm leading-6 text-neutral-600">{verificationDescription}</p>
        </div>
      </Section>
      <Section title="Sign out" description="End your current session on this device.">
        <AccountSignOutButton />
      </Section>
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