import Link from "next/link";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";

type ContactSubmission = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  county: string | null;
  topic: string;
  message: string;
  status: string;
  created_at: string;
};

const STATUSES = ["all", "new", "in_review", "resolved", "closed"] as const;
const STATUS_STYLES: Record<string, string> = {
  new: "bg-rose-50 text-rose-800",
  in_review: "bg-amber-50 text-amber-800",
  resolved: "bg-emerald-50 text-emerald-800",
  closed: "bg-gray-100 text-gray-700",
};

function hrefFor(status: string, query: string) {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (query) params.set("q", query);
  const suffix = params.toString();
  return suffix
    ? `/admin/contact-messages?${suffix}`
    : "/admin/contact-messages";
}

function humanize(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default async function AdminContactMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const status = STATUSES.includes(params.status as (typeof STATUSES)[number])
    ? (params.status as (typeof STATUSES)[number])
    : "all";
  const query = (params.q ?? "").trim().slice(0, 100).toLowerCase();
  const { data, error } = await getSupabaseAdmin()
    .from("contact_submissions")
    .select(
      "id, name, email, phone, county, topic, message, status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(
      "Unable to load contact messages. Apply the contact submissions migration and try again.",
    );
  }

  const submissions = (data ?? []) as ContactSubmission[];
  const visibleSubmissions = submissions.filter((submission) => {
    if (status !== "all" && submission.status !== status) return false;
    if (!query) return true;
    return [
      submission.name,
      submission.email,
      submission.phone,
      submission.county,
      submission.topic,
      submission.message,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
  const statusCounts = new Map(
    STATUSES.map((item) => [
      item,
      item === "all"
        ? submissions.length
        : submissions.filter((submission) => submission.status === item).length,
    ]),
  );
  const newCount = statusCounts.get("new") ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#D9D5CF] pb-4">
        <div>
          <p className="text-xs font-semibold uppercase text-[#9C2454]">
            Public contact form · Admin only
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[#1B1A2E]">
            Contact Messages
          </h1>
          <p className="mt-1 text-sm text-[#5F5D69]">
            Inquiries sent from the Contact Us page.
          </p>
        </div>
        <p className="text-sm font-medium text-[#5F5D69]">
          <span className="font-semibold text-[#9C2454]">{newCount}</span> new
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D9D5CF] pb-3">
        <nav
          aria-label="Filter contact messages"
          className="flex flex-wrap gap-1"
        >
          {STATUSES.map((item) => (
            <Link
              key={item}
              href={hrefFor(item, query)}
              aria-current={status === item ? "page" : undefined}
              className={`rounded-md px-3 py-2 text-sm ${
                status === item
                  ? "bg-[#1B1A2E] text-white"
                  : "text-[#5F5D69] hover:bg-[#F2F0EC]"
              }`}
            >
              {item === "all" ? "All" : humanize(item)}
              <span
                className={`ml-1 tabular-nums ${
                  status === item ? "text-white/70" : "text-[#96939E]"
                }`}
              >
                {statusCounts.get(item) ?? 0}
              </span>
            </Link>
          ))}
        </nav>

        <form
          action="/admin/contact-messages"
          className="flex w-full max-w-md gap-2"
        >
          {status !== "all" && (
            <input type="hidden" name="status" value={status} />
          )}
          <label htmlFor="contact-message-search" className="sr-only">
            Search contact messages
          </label>
          <input
            id="contact-message-search"
            name="q"
            type="search"
            defaultValue={params.q ?? ""}
            maxLength={100}
            placeholder="Search name, email, or message"
            className="min-w-0 flex-1 rounded-md border border-[#D9D5CF] bg-white px-3 py-2 text-sm text-[#1B1A2E] placeholder:text-gray-400 focus:border-[#9C2454] focus:outline-none focus:ring-2 focus:ring-[#9C2454]/20"
          />
          <button
            type="submit"
            className="rounded-md bg-[#1B1A2E] px-4 py-2 text-sm font-medium text-white hover:bg-[#302F43]"
          >
            Search
          </button>
        </form>
      </div>

      <p className="text-xs text-[#797783]">
        {visibleSubmissions.length}{" "}
        {visibleSubmissions.length === 1 ? "message" : "messages"} shown ·
        latest 200
      </p>

      {visibleSubmissions.length === 0 ? (
        <p className="border-y border-[#D9D5CF] bg-white px-4 py-12 text-center text-sm text-[#797783]">
          No contact messages match this view.
        </p>
      ) : (
        <section
          aria-label="Contact form messages"
          className="divide-y border-y border-[#D9D5CF] bg-white"
        >
          {visibleSubmissions.map((submission) => (
            <article key={submission.id} className="space-y-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-[#1B1A2E]">
                      {submission.name}
                    </h2>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        STATUS_STYLES[submission.status] ??
                        "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {humanize(submission.status)}
                    </span>
                    <span className="text-sm text-[#5F5D69]">
                      {submission.topic}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 text-sm text-[#5F5D69]">
                    <a
                      className="font-medium text-[#9C2454] hover:underline"
                      href={`mailto:${submission.email}`}
                    >
                      {submission.email}
                    </a>
                    {submission.phone && (
                      <a
                        className="hover:underline"
                        href={`tel:${submission.phone.replace(/[^\\d+]/g, "")}`}
                      >
                        {submission.phone}
                      </a>
                    )}
                    {submission.county && <span>{submission.county}</span>}
                  </div>
                </div>
                <time
                  dateTime={submission.created_at}
                  className="shrink-0 text-xs text-[#797783]"
                >
                  {new Intl.DateTimeFormat("en-KE", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(submission.created_at))}
                </time>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[#363541]">
                {submission.message}
              </p>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
