// FILE LOCATION: components/account/ui.tsx
// Put this file at components/account/ui.tsx in your project root (or src/components/account/ui.tsx if your project has a src/ folder).

import Link from 'next/link';
import type { ReactNode } from 'react';
import { initials } from '@/app/lib/format';
import type { ActionResult } from '@/types/account';

/* ---------- shared class strings ---------- */

export const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700';

export const inputClass =
  'block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/25 disabled:bg-neutral-100 disabled:text-neutral-500';

export const btnPrimary = `inline-flex items-center justify-center rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

export const btnSecondary = `inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

export const btnDanger = `inline-flex items-center justify-center rounded-lg bg-rose-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

export const textLink = `text-sm font-medium text-teal-800 underline underline-offset-2 hover:text-teal-900 ${focusRing}`;

/* ---------- layout pieces ---------- */

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-3xl text-neutral-900">{title}</h1>
        {description && <p className="mt-1.5 max-w-prose text-neutral-500">{description}</p>}
      </div>
      {action}
    </header>
  );
}

/** Settings-style block: title on the left, content on the right, ruled rather than boxed. */
export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-6 border-t border-neutral-200 py-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-10">
      <div>
        <h2 className="font-serif text-lg text-neutral-900">{title}</h2>
        {description && <p className="mt-1 text-sm leading-relaxed text-neutral-500">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function StatStrip({ items }: { items: { label: string; value: ReactNode }[] }) {
  const cols = items.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4';
  return (
    <dl className={`grid ${cols} gap-px overflow-hidden rounded-xl bg-neutral-200 ring-1 ring-neutral-200`}>
      {items.map((item) => (
        <div key={item.label} className="bg-white px-5 py-4">
          <dt className="text-sm text-neutral-500">{item.label}</dt>
          <dd className="mt-1 font-serif text-2xl text-neutral-900">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function EmptyState({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-300 px-6 py-12 text-center">
      <p className="font-serif text-lg text-neutral-900">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500">{body}</p>
      {href && cta && (
        <Link href={href} className={`${btnPrimary} mt-5`}>
          {cta}
        </Link>
      )}
    </div>
  );
}

/* ---------- small atoms ---------- */

const TONES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  owed: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  confirmed: 'bg-teal-50 text-teal-800 ring-teal-700/20',
  paid: 'bg-teal-50 text-teal-800 ring-teal-700/20',
  success: 'bg-teal-50 text-teal-800 ring-teal-700/20',
  active: 'bg-teal-50 text-teal-800 ring-teal-700/20',
  completed: 'bg-neutral-100 text-neutral-700 ring-neutral-500/20',
  refunded: 'bg-neutral-100 text-neutral-700 ring-neutral-500/20',
  cancelled: 'bg-rose-50 text-rose-800 ring-rose-600/20',
  failed: 'bg-rose-50 text-rose-800 ring-rose-600/20',
  suspended: 'bg-rose-50 text-rose-800 ring-rose-600/20',
  expired: 'bg-neutral-100 text-neutral-700 ring-neutral-500/20',
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const tone = TONES[status] ?? TONES.completed;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${tone}`}
    >
      {label ?? status.replace(/_/g, ' ')}
    </span>
  );
}

export function StarIcon({ className = '', size = 16 }: { className?: string; size?: number }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width={size} height={size} className={className} aria-hidden="true">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

export function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex" role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} className={n <= rating ? 'text-amber-500' : 'text-neutral-300'} />
      ))}
    </span>
  );
}

export function Avatar({ name, url, size = 'md' }: { name: string; url?: string | null; size?: 'md' | 'lg' }) {
  const dims = size === 'lg' ? 'h-24 w-24 text-3xl' : 'h-14 w-14 text-lg';
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className={`${dims} shrink-0 rounded-full object-cover`} />;
  }
  return (
    <span
      aria-hidden="true"
      className={`${dims} inline-flex shrink-0 items-center justify-center rounded-full bg-teal-800 font-serif text-teal-50`}
    >
      {initials(name)}
    </span>
  );
}

/* ---------- forms ---------- */

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-neutral-800">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && (
        <p id={`${htmlFor}-hint`} className="mt-1.5 text-xs text-neutral-500">
          {hint}
        </p>
      )}
    </div>
  );
}

export function FormMessage({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  return result.ok ? (
    <p role="status" className="text-sm text-teal-800">
      {result.message ?? 'Saved.'}
    </p>
  ) : (
    <p role="alert" className="text-sm text-rose-700">
      {result.error}
    </p>
  );
}