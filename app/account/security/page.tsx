// FILE LOCATION: app/account/security/page.tsx
// Put this file at app/account/security/page.tsx in your project root (or src/app/account/security/page.tsx if your project has a src/ folder).

import { getAccountContext } from '@/app/lib/account';
import { formatDate } from '@/app/lib/format';
import { PasswordForm, SignOutEverywhere } from '@/components/account/SecurityForms';
import { PageHeader, Section } from '@/components/account/ui';

export default async function SecurityPage() {
  const { user } = await getAccountContext();

  // People who signed up with Google (or another provider) have no password to change.
  const providers = (user.app_metadata?.providers as string[] | undefined) ?? [];
  const hasPassword = providers.length === 0 || providers.includes('email');
  const providerNames = providers.filter((p) => p !== 'email').join(', ');

  return (
    <>
      <PageHeader title="Security" description="Keep your account and payments safe." />

      <Section title="Sign-in" description="How you get into your account.">
        <dl className="grid max-w-xl gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-neutral-500">Email</dt>
            <dd className="mt-0.5 break-all text-neutral-900">{user.email}</dd>
            <p className={`mt-0.5 text-xs ${user.email_confirmed_at ? 'text-teal-800' : 'text-amber-700'}`}>
              {user.email_confirmed_at ? 'Verified' : 'Not verified yet'}
            </p>
          </div>
          <div>
            <dt className="text-neutral-500">Last sign-in</dt>
            <dd className="mt-0.5 text-neutral-900">
              {user.last_sign_in_at ? formatDate(user.last_sign_in_at, 'long') : 'Not available'}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Account created</dt>
            <dd className="mt-0.5 text-neutral-900">{formatDate(user.created_at, 'long')}</dd>
          </div>
        </dl>
      </Section>

      <Section title="Password" description="Use a password you don’t use anywhere else.">
        {hasPassword ? (
          <PasswordForm />
        ) : (
          <p className="max-w-xl text-sm text-neutral-600">
            You sign in with {providerNames || 'a connected account'}, so there’s no password to change here.
          </p>
        )}
      </Section>

      <Section title="Devices" description="If you’ve signed in on a shared or lost device, end every session.">
        <SignOutEverywhere />
      </Section>

      <Section title="Delete account">
        <p className="max-w-xl text-sm text-neutral-600">
          To delete your account and personal data, contact support. Bookings and payment records may be kept where the
          law requires it.
        </p>
      </Section>
    </>
  );
}