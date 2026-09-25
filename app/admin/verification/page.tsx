import Link from 'next/link';
import { formatDate, humanize } from '@/app/lib/format';
import { getSupabaseAdmin } from '@/app/lib/supabase/admin';
import { reviewHostVerification } from './actions';

type HostApplication = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  host_type: string | null;
  business_name: string | null;
  id_number: string | null;
  id_document_type: string | null;
  id_document_url: string | null;
  date_of_birth: string | null;
  county: string | null;
  residential_address: string | null;
  payout_method: string | null;
  payout_details: Record<string, string> | null;
  host_bio: string | null;
  kyc_status: string | null;
  kyc_submitted_at: string | null;
  kyc_rejection_reason: string | null;
  host_verified_at: string | null;
};

const FILTERS = ['pending', 'rejected', 'approved', 'all'];

function masked(value: string | null | undefined) {
  if (!value) return 'Not provided';
  return value.length < 5 ? '••••' : `••••${value.slice(-4)}`;
}

function statusTone(status: string | null) {
  if (status === 'approved') return 'bg-emerald-50 text-emerald-800';
  if (status === 'rejected') return 'bg-rose-50 text-rose-800';
  return 'bg-amber-50 text-amber-800';
}

export default async function HostVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const status = FILTERS.includes(params.status ?? 'pending') ? params.status ?? 'pending' : 'pending';
  const query = (params.q ?? '').trim().slice(0, 100).toLowerCase();
  const admin = getSupabaseAdmin();

  let applicationsQuery = admin
    .from('profiles')
    .select('id, full_name, phone, email, host_type, business_name, id_number, id_document_type, id_document_url, date_of_birth, county, residential_address, payout_method, payout_details, host_bio, kyc_status, kyc_submitted_at, kyc_rejection_reason, host_verified_at')
    .eq('role', 'host')
    .order('kyc_submitted_at', { ascending: false, nullsFirst: false })
    .limit(200);
  if (status !== 'all') applicationsQuery = applicationsQuery.eq('kyc_status', status);

  const { data, error } = await applicationsQuery;
  if (error) throw new Error('Unable to load host applications. Apply the host verification migration and try again.');

  const rows = (data ?? []) as HostApplication[];
  const visibleRows = rows.filter((host) =>
    !query || [host.full_name, host.business_name, host.email, host.phone, host.county, host.id]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query),
  );
  const documentLinks = await Promise.all(visibleRows.map(async (host) => {
    if (!host.id_document_url) return [host.id, null] as const;
    const { data: signed, error: signedError } = await admin.storage
      .from('host-documents')
      .createSignedUrl(host.id_document_url, 300);
    return [host.id, signedError ? null : signed.signedUrl] as const;
  }));
  const documentUrlByHost = new Map(documentLinks);

  return (
    <div className="max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-[#E23E85]">Host Verification</h1>
        <p className="mt-1 text-sm text-gray-600">Review submitted identity and payout details before approving a host.</p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-3">
        <nav aria-label="Filter host verification status" className="flex flex-wrap gap-1">
          {FILTERS.map((filter) => (
            <Link
              key={filter}
              href={`/admin/verification?${new URLSearchParams({
                ...(filter !== 'pending' ? { status: filter } : {}),
                ...(query ? { q: query } : {}),
              }).toString()}`}
              aria-current={status === filter ? 'page' : undefined}
              className={`rounded-md px-3 py-2 text-sm ${status === filter ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {humanize(filter)}
            </Link>
          ))}
        </nav>
        <form action="/admin/verification" className="flex w-full max-w-md gap-2">
          {status !== 'pending' && <input type="hidden" name="status" value={status} />}
          <label htmlFor="verification-search" className="sr-only">Search applications</label>
          <input id="verification-search" name="q" type="search" defaultValue={params.q ?? ''} maxLength={100} placeholder="Search name, email, phone, or county" className="min-w-0 flex-1 rounded-md border border-[#D9D5CF] bg-white px-3 py-2 text-sm text-[#1B1A2E] placeholder:text-gray-400 focus:border-[#E23E85] focus:outline-none focus:ring-2 focus:ring-[#E23E85]/20" />
          <button type="submit" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">Search</button>
        </form>
      </div>

      <p className="text-xs text-gray-500">{visibleRows.length} applications shown · latest 200</p>

      {visibleRows.length === 0 ? (
        <p className="border-y bg-white px-4 py-12 text-center text-sm text-gray-500">
          {status === 'pending' ? 'No host applications are waiting for review.' : 'No host applications match this filter.'}
        </p>
      ) : (
        <div className="divide-y border-y bg-white">
          {visibleRows.map((host) => {
            const documentUrl = documentUrlByHost.get(host.id);
            const payoutDetails = host.payout_details ?? {};
            const payoutValue = host.payout_method === 'mpesa'
              ? masked(payoutDetails.mpesa_number ?? payoutDetails.phone)
              : host.payout_method === 'bank'
                ? `${payoutDetails.bank_name ?? 'Bank'} · ${masked(payoutDetails.account_number)}`
                : 'Not provided';
            const canReview = host.kyc_status === 'pending';

            return (
              <article key={host.id} className="grid gap-6 p-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-semibold text-[#1B1A2E]">{host.full_name ?? 'Unnamed host'}</h2>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(host.kyc_status)}`}>{humanize(host.kyc_status ?? 'not submitted')}</span>
                    <Link href={`/admin/users/${host.id}`} className="text-xs font-medium text-[#CF2F74] hover:underline">Open user profile</Link>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{host.business_name ?? humanize(host.host_type ?? 'individual')} · submitted {formatDate(host.kyc_submitted_at, 'long')}</p>

                  <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div><dt className="text-xs text-gray-500">Email</dt><dd className="mt-1 break-all text-sm text-[#1B1A2E]">{host.email ?? 'Not provided'}</dd></div>
                    <div><dt className="text-xs text-gray-500">Phone</dt><dd className="mt-1 text-sm text-[#1B1A2E]">{host.phone ?? 'Not provided'}</dd></div>
                    <div><dt className="text-xs text-gray-500">ID type / last digits</dt><dd className="mt-1 text-sm text-[#1B1A2E]">{humanize(host.id_document_type ?? 'ID')} · {masked(host.id_number)}</dd></div>
                    <div><dt className="text-xs text-gray-500">Date of birth</dt><dd className="mt-1 text-sm text-[#1B1A2E]">{host.date_of_birth ? formatDate(host.date_of_birth, 'long') : 'Not provided'}</dd></div>
                    <div><dt className="text-xs text-gray-500">Residence</dt><dd className="mt-1 text-sm text-[#1B1A2E]">{[host.residential_address, host.county].filter(Boolean).join(', ') || 'Not provided'}</dd></div>
                    <div><dt className="text-xs text-gray-500">Payout destination</dt><dd className="mt-1 text-sm text-[#1B1A2E]">{humanize(host.payout_method ?? 'not set')} · {payoutValue}</dd></div>
                  </dl>

                  {host.host_bio && <p className="mt-5 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-gray-600">{host.host_bio}</p>}
                  {host.kyc_rejection_reason && <p className="mt-4 border-l-2 border-rose-400 bg-rose-50 px-3 py-2 text-sm text-rose-800">Previous rejection: {host.kyc_rejection_reason}</p>}

                  {documentUrl ? (
                    <a href={documentUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-[#1B1A2E] hover:bg-gray-50">
                      View private ID document
                    </a>
                  ) : (
                    <p className="mt-5 text-sm text-rose-700">ID document unavailable. Ask the host to resubmit it.</p>
                  )}
                </div>

                {canReview && (
                  <div className="space-y-4 border-t pt-4 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
                    <form action={reviewHostVerification}>
                      <input type="hidden" name="host_id" value={host.id} />
                      <input type="hidden" name="decision" value="approved" />
                      <button type="submit" className="w-full rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">Approve host</button>
                    </form>
                    <form action={reviewHostVerification} className="space-y-2">
                      <input type="hidden" name="host_id" value={host.id} />
                      <input type="hidden" name="decision" value="rejected" />
                      <label htmlFor={`reason-${host.id}`} className="block text-sm font-medium text-[#1B1A2E]">Reason for rejection</label>
                      <textarea id={`reason-${host.id}`} name="reason" required minLength={10} maxLength={1000} rows={4} placeholder="Explain what needs correction so the host can resubmit." className="w-full rounded-md border border-[#D9D5CF] bg-[#F7F5F2] px-3 py-2 text-sm text-[#1B1A2E] placeholder:text-gray-400 focus:border-[#E23E85] focus:outline-none focus:ring-2 focus:ring-[#E23E85]/20" />
                      <button type="submit" className="w-full rounded-md border border-rose-300 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50">Reject and request changes</button>
                    </form>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}