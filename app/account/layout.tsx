import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getAccountContext } from '@/app/lib/account';
import { AccountNav, SignOutButton } from '@/components/account/AccountNav';
import { Avatar } from '@/components/account/ui';

export const metadata: Metadata = {
  title: 'My account | Dominium BnB',
  robots: { index: false },
};

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const { user, profile } = await getAccountContext();
  const isHost = profile.role === 'host';
  const roleLabel =
    profile.role === 'admin' ? 'Admin' : isHost ? (profile.host_verified_at ? 'Verified host' : 'Host') : 'Guest';

  return (
    <div className="bg-neutral-50 text-neutral-900">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14 lg:py-12">
        <aside className="space-y-5 lg:sticky lg:top-8 lg:self-start">
          <div className="flex items-center gap-3 lg:flex-col lg:items-start lg:gap-4">
            <Avatar name={profile.full_name} url={profile.avatar_url} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-serif text-lg leading-tight">{profile.full_name}</p>
              <p className="truncate text-sm text-neutral-500">{user.email}</p>
              <p className="mt-1 text-xs text-neutral-500">{roleLabel}</p>
            </div>
            <SignOutButton className="lg:hidden" />
          </div>

          <AccountNav isHost={isHost} />

          <div className="hidden lg:block">
            <SignOutButton className="w-full" />
          </div>
        </aside>

        <main className="mt-8 min-w-0 lg:mt-0">
          {profile.status === 'suspended' && (
            <div role="alert" className="mb-8 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
              <p className="font-medium">Your account is suspended.</p>
              <p className="mt-1">
                {profile.suspended_reason ?? 'Contact support to find out why and how to restore access.'}
              </p>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}