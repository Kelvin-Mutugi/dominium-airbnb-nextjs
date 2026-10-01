import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getAccountContext } from '@/app/lib/account';
import { AccountNav } from '@/components/account/AccountNav';
import Navbar from '@/components/navigationBar';

export const metadata: Metadata = {
  title: 'My account | Dominium BnB',
  robots: { index: false },
};

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const { profile } = await getAccountContext();
  const isHost = profile.role === 'host';

  return (
    <div className="min-h-screen bg-white text-[#1B1A2E]">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 pb-28 pt-5 sm:px-6 md:grid md:h-[calc(100dvh-72px)] md:min-h-0 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-8 md:overflow-hidden md:px-8 md:pb-8 md:pt-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12 lg:pt-10">
        <aside className="md:min-h-0 md:h-full md:overflow-y-auto md:overscroll-contain md:pr-1">
          <AccountNav isHost={isHost} />
        </aside>

        <main className="mt-5 w-full min-w-0 md:mt-0 md:h-full md:min-h-0 md:max-w-5xl md:overflow-y-auto md:overscroll-contain md:pb-8 md:pr-2">
          {profile.status === 'suspended' && (
            <div role="alert" className="mb-6 rounded-2xl bg-[#FCE8F0] p-4 text-sm text-[#9C2454]">
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