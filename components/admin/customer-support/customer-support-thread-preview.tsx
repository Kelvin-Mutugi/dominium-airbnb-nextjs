import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { formatDateTime } from '@/app/lib/format';
import type { CustomerSupportThreadStatus } from '@/app/customer-support/actions';

const STATUS_LABELS: Record<CustomerSupportThreadStatus, string> = {
  waiting_on_admin: 'Needs reply',
  waiting_on_requester: 'Waiting on requester',
  resolved: 'Resolved',
  closed: 'Closed',
};

export type CustomerSupportPreviewItem = {
  id: string;
  bookingId: string;
  status: CustomerSupportThreadStatus;
  requesterName: string;
  requesterRole: 'guest' | 'host';
  listingTitle: string;
  checkIn: string;
  checkOut: string;
  updatedAt: string;
  latestMessage: string | null;
  latestSender: 'guest' | 'host' | 'admin' | null;
};

export function CustomerSupportThreadPreview({ item }: { item: CustomerSupportPreviewItem }) {
  return (
    <Link href={`/admin/customer-support/${item.id}`} className="group grid gap-3 border-b border-[#E9E6DD] bg-white px-4 py-4 transition hover:bg-[#FBFAF7] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#9C2454]/50 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] sm:items-center sm:px-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${item.status === 'waiting_on_admin' ? 'bg-amber-100 text-amber-900' : item.status === 'waiting_on_requester' ? 'bg-sky-100 text-sky-900' : item.status === 'resolved' ? 'bg-emerald-100 text-emerald-900' : 'bg-gray-100 text-gray-700'}`}>
            {STATUS_LABELS[item.status]}
          </span>
          <span className="text-xs text-[#797783]">{item.requesterRole === 'guest' ? 'Guest' : 'Host'}</span>
        </div>
        <p className="mt-1 truncate text-sm font-semibold text-[#1B1A2E]">{item.requesterName}</p>
        <p className="truncate text-xs text-[#797783]">{item.listingTitle}</p>
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium text-[#5F5D69]">Booking <span className="font-mono">{item.bookingId.slice(0, 8).toUpperCase()}</span> · {item.checkIn} to {item.checkOut}</p>
        <p className="mt-1 truncate text-sm text-[#5F5D69]">
          {item.latestMessage ? <><span className="font-medium text-[#1B1A2E]">{item.latestSender === 'admin' ? 'Support: ' : `${item.requesterRole === 'guest' ? 'Guest' : 'Host'}: `}</span>{item.latestMessage}</> : 'No message yet'}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <time dateTime={item.updatedAt} className="text-xs text-[#797783]">{formatDateTime(item.updatedAt)}</time>
        <ArrowRight className="h-4 w-4 shrink-0 text-[#9C2454] transition group-hover:translate-x-0.5" aria-hidden="true" />
      </div>
    </Link>
  );
}