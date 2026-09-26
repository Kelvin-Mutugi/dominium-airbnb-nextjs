"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Copy,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  addHostCalendarConnection,
  addHostAvailabilityBlock,
  getHostCalendarConnections,
  getHostCalendarData,
  removeHostCalendarConnection,
  rotateHostCalendarExportFeed,
  removeHostAvailabilityBlock,
  syncHostCalendarConnection,
} from "@/app/lib/host/actions";
import type { AvailabilityBlock, Booking, Listing } from "@/app/lib/host/types";

type CalendarListing = Pick<Listing, "id" | "title" | "status">;
type ExternalCalendarBlock = { id: string; listing_id: string; start_date: string; end_date: string; source_name: string };
type CalendarConnection = {
  id: string;
  listing_id: string;
  source_name: string;
  last_synced_at: string | null;
  last_sync_status: "never" | "ok" | "error";
  last_sync_error: string | null;
};

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateFromKey(value: string) {
  return new Date(`${value}T12:00:00`);
}

function formatDate(value: string) {
  return dateFromKey(value).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function HostCalendarPage() {
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [listings, setListings] = useState<CalendarListing[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [externalBlocks, setExternalBlocks] = useState<ExternalCalendarBlock[]>([]);
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [selectedListingId, setSelectedListingId] = useState("all");
  const [blockListingId, setBlockListingId] = useState("");
  const [connectionListingId, setConnectionListingId] = useState("");
  const [connectionName, setConnectionName] = useState("");
  const [connectionUrl, setConnectionUrl] = useState("");
  const [exportListingId, setExportListingId] = useState("");
  const [exportUrl, setExportUrl] = useState("");
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingConnection, setSavingConnection] = useState(false);
  const [syncingConnectionId, setSyncingConnectionId] = useState<string | null>(null);
  const [removingConnectionId, setRemovingConnectionId] = useState<string | null>(null);
  const [creatingExport, setCreatingExport] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;

  useEffect(() => {
    let active = true;

    async function loadCalendar() {
      try {
        setError(null);
        setLoadFailed(false);
        const [data, hostConnections] = await Promise.all([
          getHostCalendarData(monthKey),
          getHostCalendarConnections(),
        ]);
        if (!active) return;
        const hostListings = data.listings as CalendarListing[];
        setListings(hostListings);
        setBookings(data.bookings as Booking[]);
        setBlocks(data.blocks as AvailabilityBlock[]);
        setExternalBlocks(data.externalBlocks as ExternalCalendarBlock[]);
        setConnections(hostConnections as CalendarConnection[]);
        setBlockListingId((current) => current || hostListings[0]?.id || "");
        setConnectionListingId((current) => current || hostListings[0]?.id || "");
        setExportListingId((current) => current || hostListings[0]?.id || "");
      } catch (loadError) {
        console.error("Failed to load host calendar:", loadError);
        if (active) {
          setError("We couldn't load your calendar. Please try again.");
          setLoadFailed(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadCalendar();
    return () => {
      active = false;
    };
  }, [monthKey, reloadToken]);

  const visibleBookings = bookings.filter(
    (booking) => selectedListingId === "all" || booking.listing_id === selectedListingId,
  );
  const visibleBlocks = blocks.filter(
    (block) => selectedListingId === "all" || block.listing_id === selectedListingId,
  );
  const visibleExternalBlocks = externalBlocks.filter(
    (block) => selectedListingId === "all" || block.listing_id === selectedListingId,
  );
  const externalConflicts = visibleBookings.flatMap((booking) =>
    visibleExternalBlocks
      .filter((block) =>
        block.listing_id === booking.listing_id &&
        booking.check_in < block.end_date &&
        booking.check_out > block.start_date,
      )
      .map((block) => ({ booking, block })),
  );
  const monthStart = `${monthKey}-01`;
  const nextMonthDate = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const nextMonthStart = dateKey(nextMonthDate);
  const weekStart = new Date(month.getFullYear(), month.getMonth(), 1);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + index);
    return day;
  });
  const agendaRows = [
    ...visibleBookings.map((booking) => ({
      id: `booking-${booking.id}`,
      type: booking.status === "pending" ? "Pending request" : "Confirmed stay",
      start: booking.check_in,
      end: booking.check_out,
      listingTitle: booking.listing?.title ?? "Listing",
      detail: `${booking.guest_name ?? "Guest"} · ${booking.guests_count} guests`,
      href: `/host/bookings?status=${booking.status}&booking=${encodeURIComponent(booking.id)}`,
      tone: booking.status === "pending" ? "border-amber-300" : "border-emerald-300",
    })),
    ...visibleBlocks.map((block) => ({
      id: `block-${block.id}`,
      type: "Blocked dates",
      start: block.start_date,
      end: block.end_date,
      listingTitle: listings.find((listing) => listing.id === block.listing_id)?.title ?? "Listing",
      detail: block.reason || "Unavailable",
      href: null,
      tone: "border-gray-300",
    })),
    ...visibleExternalBlocks.map((block) => ({
      id: `external-${block.id}`,
      type: "External booking",
      start: block.start_date,
      end: block.end_date,
      listingTitle: listings.find((listing) => listing.id === block.listing_id)?.title ?? "Listing",
      detail: `Busy from ${block.source_name}`,
      href: null,
      tone: "border-sky-300",
    })),
  ]
    .filter((item) => item.start < nextMonthStart && item.end > monthStart)
    .sort((left, right) => left.start.localeCompare(right.start));

  function changeMonth(offset: number) {
    setLoading(true);
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function retry() {
    setLoading(true);
    setReloadToken((token) => token + 1);
  }

  async function handleAddBlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!blockListingId || startDate >= endDate || saving) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await addHostAvailabilityBlock(blockListingId, startDate, endDate, reason);
      setStartDate("");
      setEndDate("");
      setReason("");
      setSuccess("Dates blocked successfully.");
      setReloadToken((token) => token + 1);
    } catch (blockError) {
      setLoadFailed(false);
      setError(blockError instanceof Error ? blockError.message : "We couldn't block these dates.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveBlock(id: string) {
    if (removingId) return;
    setRemovingId(id);
    setError(null);
    setSuccess(null);
    try {
      await removeHostAvailabilityBlock(id);
      setSuccess("Blocked dates removed.");
      setReloadToken((token) => token + 1);
    } catch (removeError) {
      setLoadFailed(false);
      setError(removeError instanceof Error ? removeError.message : "We couldn't remove these blocked dates.");
    } finally {
      setRemovingId(null);
    }
  }

  async function handleConnectCalendar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!connectionListingId || !connectionUrl.trim() || savingConnection) return;
    setSavingConnection(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await addHostCalendarConnection(connectionListingId, connectionUrl.trim(), connectionName);
      setConnectionUrl("");
      setConnectionName("");
      setSuccess(result.syncMessage ? `Calendar connected. Initial sync needs attention: ${result.syncMessage}` : "Calendar connected and synced.");
      setReloadToken((token) => token + 1);
    } catch (connectionError) {
      setError(connectionError instanceof Error ? connectionError.message : "We couldn't connect this calendar.");
      setLoadFailed(false);
    } finally {
      setSavingConnection(false);
    }
  }

  async function handleSyncConnection(id: string) {
    if (syncingConnectionId) return;
    setSyncingConnectionId(id);
    setError(null);
    setSuccess(null);
    try {
      const result = await syncHostCalendarConnection(id);
      setSuccess(`Calendar synced. ${result.imported} busy periods imported.`);
      setReloadToken((token) => token + 1);
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "We couldn't sync this calendar.");
      setLoadFailed(false);
      setReloadToken((token) => token + 1);
    } finally {
      setSyncingConnectionId(null);
    }
  }

  async function handleRemoveConnection(id: string) {
    if (removingConnectionId) return;
    setRemovingConnectionId(id);
    setError(null);
    setSuccess(null);
    try {
      await removeHostCalendarConnection(id);
      setSuccess("Calendar disconnected and its imported busy dates removed.");
      setReloadToken((token) => token + 1);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "We couldn't remove this calendar.");
      setLoadFailed(false);
    } finally {
      setRemovingConnectionId(null);
    }
  }

  async function handleCreateExportFeed() {
    if (!exportListingId || creatingExport) return;
    setCreatingExport(true);
    setError(null);
    setSuccess(null);
    try {
      const token = await rotateHostCalendarExportFeed(exportListingId);
      setExportUrl(`${window.location.origin}/api/host/calendar/${token}`);
      setCopyMessage(null);
      setSuccess("Private calendar link generated. Copy it now; it won't be shown again.");
    } catch (feedError) {
      setError(feedError instanceof Error ? feedError.message : "We couldn't generate the calendar link.");
      setLoadFailed(false);
    } finally {
      setCreatingExport(false);
    }
  }

  async function handleCopyExportFeed() {
    if (!exportUrl) return;
    try {
      await navigator.clipboard.writeText(exportUrl);
      setCopyMessage("Copied");
    } catch {
      setCopyMessage("Select and copy the link");
    }
  }

  function eventsForDay(key: string) {
    const dayBookings = visibleBookings
      .filter((booking) => booking.check_in <= key && booking.check_out > key)
      .map((booking) => ({
        id: `booking-${booking.id}`,
        label: `${booking.status === "pending" ? "Request" : "Stay"}: ${booking.listing?.title ?? "Listing"}`,
        href: `/host/bookings?status=${booking.status}&booking=${encodeURIComponent(booking.id)}`,
        className: booking.status === "pending" ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900",
      }));
    const dayBlocks = visibleBlocks
      .filter((block) => block.start_date <= key && block.end_date > key)
      .map((block) => ({
        id: `block-${block.id}`,
        label: `Blocked: ${listings.find((listing) => listing.id === block.listing_id)?.title ?? "Listing"}`,
        href: null,
        className: "bg-gray-100 text-gray-700",
      }));
    const importedBusy = visibleExternalBlocks
      .filter((block) => block.start_date <= key && block.end_date > key)
      .map((block) => ({
        id: `external-${block.id}`,
        label: `External: ${listings.find((listing) => listing.id === block.listing_id)?.title ?? "Listing"}`,
        href: null,
        className: "bg-sky-100 text-sky-900",
      }));
    return [...dayBookings, ...dayBlocks, ...importedBusy];
  }

  const todayKey = dateKey(new Date());
  const monthLabel = month.toLocaleDateString("en-KE", { month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#12231d]">Calendar</h1>
          <p className="mt-1 text-sm text-gray-500">Reservations and availability across your listings.</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
          Listing
          <select
            value={selectedListingId}
            onChange={(event) => setSelectedListingId(event.target.value)}
            className="max-w-56 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-[#12231d] focus:border-[#ec1561] focus:outline-none focus:ring-2 focus:ring-[#ec1561]/20"
          >
            <option value="all">All listings</option>
            {listings.map((listing) => <option key={listing.id} value={listing.id}>{listing.title}</option>)}
          </select>
        </label>
      </header>

      {error && (
        <div role="alert" className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          {loadFailed && <button onClick={retry} className="shrink-0 font-semibold underline underline-offset-2">Try again</button>}
        </div>
      )}
      {success && <p role="status" className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{success}</p>}
      {externalConflicts.length > 0 && (
        <section role="alert" className="space-y-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          <h2 className="font-semibold">External calendar conflicts need review</h2>
          <ul className="list-inside list-disc">
            {externalConflicts.map(({ booking, block }) => (
              <li key={`${booking.id}-${block.id}`}>
                {block.source_name} overlaps {booking.listing?.title ?? "a listing"} ({booking.check_in} to {booking.check_out}).{" "}
                <Link href={`/host/bookings?status=${booking.status}&booking=${encodeURIComponent(booking.id)}`} className="font-semibold underline underline-offset-2">Review booking</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!loading && !error && listings.length === 0 ? (
        <section className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-gray-400" aria-hidden="true" />
          <h2 className="mt-3 font-semibold text-[#12231d]">No listings to schedule yet</h2>
          <p className="mt-1 text-sm text-gray-500">Create a listing to manage bookings and availability here.</p>
          <Link href="/host/listings/new" className="mt-5 inline-flex rounded-lg bg-[#12231d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#243c34]">Create listing</Link>
        </section>
      ) : (
        <>
          <section className="space-y-4 rounded-xl bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="min-w-36 text-lg font-semibold text-[#12231d]">{monthLabel}</h2>
                <div className="flex items-center">
                  <button onClick={() => changeMonth(-1)} aria-label="Previous month" title="Previous month" className="rounded-md p-2 text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#ec1561]/40">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button onClick={() => changeMonth(1)} aria-label="Next month" title="Next month" className="rounded-md p-2 text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#ec1561]/40">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
                <button onClick={() => { setLoading(true); setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); }} className="rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-[#12231d] hover:bg-gray-50">
                  Today
                </button>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-600" aria-label="Calendar legend">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" />Pending request</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Confirmed stay</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-gray-400" />Blocked dates</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sky-500" />External booking</span>
              </div>
            </div>

            {loading && <p role="status" className="text-sm text-gray-500">Updating calendar…</p>}

            <div className="hidden grid-cols-7 border-l border-t border-gray-200 sm:grid">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div key={day} className="border-b border-r border-gray-200 bg-gray-50 px-2 py-2 text-xs font-semibold text-gray-500">{day}</div>
              ))}
              {calendarDays.map((day) => {
                const key = dateKey(day);
                const events = eventsForDay(key);
                const isCurrentMonth = day.getMonth() === month.getMonth();
                return (
                  <div key={key} className={`min-h-28 border-b border-r border-gray-200 p-1.5 ${isCurrentMonth ? "bg-white" : "bg-gray-50/70"}`}>
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${key === todayKey ? "bg-[#12231d] font-semibold text-white" : isCurrentMonth ? "text-[#12231d]" : "text-gray-400"}`}>
                      {day.getDate()}
                    </span>
                    <div className="mt-1 space-y-1">
                      {events.slice(0, 2).map((item) => item.href ? (
                        <Link key={item.id} href={item.href} title={item.label} className={`block truncate rounded px-1.5 py-1 text-left text-[11px] leading-tight hover:underline ${item.className}`}>{item.label}</Link>
                      ) : (
                        <p key={item.id} title={item.label} className={`truncate rounded px-1.5 py-1 text-[11px] leading-tight ${item.className}`}>{item.label}</p>
                      ))}
                      {events.length > 2 && <p className="px-1 text-[11px] text-gray-500">+{events.length - 2} more</p>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2 sm:hidden">
              {agendaRows.length === 0 ? (
                <p className="rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">No bookings or blocked dates this month.</p>
              ) : agendaRows.map((item) => (
                <article key={item.id} className={`border-l-4 bg-gray-50 px-3 py-3 ${item.tone}`}>
                  <p className="text-xs font-semibold text-gray-500">{item.type} · {formatDate(item.start)} to {formatDate(item.end)}</p>
                  <p className="mt-1 font-medium text-[#12231d]">{item.listingTitle}</p>
                  <p className="text-sm text-gray-600">{item.detail}</p>
                  {item.href && <Link href={item.href} className="mt-2 inline-block text-sm font-medium text-[#ec1561] underline underline-offset-2">Open booking</Link>}
                </article>
              ))}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-5 rounded-xl bg-white p-5 shadow-sm">
              <div>
                <h2 className="font-semibold text-[#12231d]">Connect another calendar</h2>
                <p className="mt-1 text-sm text-gray-500">Import an iCal link to mark outside reservations as busy here.</p>
              </div>
              <form onSubmit={handleConnectCalendar} className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium text-gray-700">
                  Listing
                  <select required value={connectionListingId} onChange={(event) => setConnectionListingId(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-[#12231d] focus:border-[#ec1561] focus:outline-none focus:ring-2 focus:ring-[#ec1561]/20">
                    {listings.map((listing) => <option key={listing.id} value={listing.id}>{listing.title}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium text-gray-700">
                  Calendar name <span className="font-normal text-gray-400">(optional)</span>
                  <input value={connectionName} onChange={(event) => setConnectionName(event.target.value)} maxLength={80} placeholder="Airbnb" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#12231d] placeholder:text-gray-400 focus:border-[#ec1561] focus:outline-none focus:ring-2 focus:ring-[#ec1561]/20" />
                </label>
                <label className="text-sm font-medium text-gray-700 sm:col-span-2">
                  External iCal URL
                  <input required type="url" value={connectionUrl} onChange={(event) => setConnectionUrl(event.target.value)} placeholder="https://..." className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#12231d] placeholder:text-gray-400 focus:border-[#ec1561] focus:outline-none focus:ring-2 focus:ring-[#ec1561]/20" />
                  <span className="mt-1 block text-xs font-normal text-gray-500">Supported: Airbnb, Booking.com, Vrbo, Google Calendar, and Outlook.</span>
                </label>
                <button type="submit" disabled={savingConnection || listings.length === 0 || !connectionUrl.trim()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#12231d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#243c34] disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2">
                  {savingConnection ? <><Loader2 className="h-4 w-4 animate-spin" />Connecting</> : "Connect and sync"}
                </button>
              </form>

              {connections.length > 0 && (
                <ul className="divide-y divide-gray-100 border-t border-gray-100">
                  {connections.map((connection) => {
                    const listingTitle = listings.find((listing) => listing.id === connection.listing_id)?.title ?? "Listing";
                    const isSyncing = syncingConnectionId === connection.id;
                    const isRemoving = removingConnectionId === connection.id;
                    return (
                      <li key={connection.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[#12231d]">{connection.source_name} <span className="font-normal text-gray-500">· {listingTitle}</span></p>
                          <p className={`mt-0.5 text-xs ${connection.last_sync_status === "error" ? "text-rose-700" : "text-gray-500"}`}>
                            {connection.last_sync_status === "error"
                              ? `Sync issue: ${connection.last_sync_error ?? "Try syncing again."}`
                              : connection.last_synced_at
                                ? `Last synced ${new Date(connection.last_synced_at).toLocaleString("en-KE")}`
                                : "Waiting for first sync"}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button type="button" disabled={Boolean(syncingConnectionId) || Boolean(removingConnectionId)} onClick={() => void handleSyncConnection(connection.id)} aria-label="Sync calendar now" title="Sync now" className="rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-[#12231d] focus:outline-none focus:ring-2 focus:ring-[#ec1561]/30 disabled:opacity-50">
                            {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                          </button>
                          <button type="button" disabled={Boolean(removingConnectionId) || Boolean(syncingConnectionId)} onClick={() => void handleRemoveConnection(connection.id)} aria-label="Disconnect calendar" title="Disconnect calendar" className="rounded-md p-2 text-gray-500 hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:opacity-50">
                            {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="space-y-4 rounded-xl bg-white p-5 shadow-sm">
              <div>
                <h2 className="font-semibold text-[#12231d]">Share your Dominium calendar</h2>
                <p className="mt-1 text-sm text-gray-500">Add this private link to another platform to share your busy dates.</p>
              </div>
              <label className="block text-sm font-medium text-gray-700">
                Listing
                <select value={exportListingId} onChange={(event) => { setExportListingId(event.target.value); setExportUrl(""); setCopyMessage(null); }} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-[#12231d] focus:border-[#ec1561] focus:outline-none focus:ring-2 focus:ring-[#ec1561]/20">
                  {listings.map((listing) => <option key={listing.id} value={listing.id}>{listing.title}</option>)}
                </select>
              </label>
              {exportUrl ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input readOnly value={exportUrl} onFocus={(event) => event.currentTarget.select()} aria-label="Private calendar link" className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-[#12231d]" />
                    <button type="button" onClick={() => void handleCopyExportFeed()} aria-label="Copy private calendar link" title="Copy link" className="shrink-0 rounded-md border border-gray-200 p-2 text-[#12231d] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#ec1561]/30">
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  <p role="status" className="text-xs text-gray-500">{copyMessage ?? "Keep this link private. Anyone with it can view busy dates."}</p>
                  <button type="button" onClick={() => void handleCreateExportFeed()} disabled={creatingExport} className="text-sm font-medium text-rose-700 underline underline-offset-2 disabled:opacity-50">{creatingExport ? "Rotating link…" : "Rotate private link"}</button>
                  <p className="text-xs text-rose-700">Rotating the link immediately disables the previous one.</p>
                </div>
              ) : (
                <button type="button" onClick={() => void handleCreateExportFeed()} disabled={!exportListingId || creatingExport} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#12231d] px-4 py-2.5 text-sm font-semibold text-[#12231d] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
                  {creatingExport ? <><Loader2 className="h-4 w-4 animate-spin" />Generating</> : "Generate private link"}
                </button>
              )}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]">
            <div className="space-y-3 rounded-xl bg-white p-5 shadow-sm">
              <div>
                <h2 className="font-semibold text-[#12231d]">Block off dates</h2>
                <p className="mt-1 text-sm text-gray-500">The end date is the checkout date and is available again that day.</p>
              </div>
              <form onSubmit={handleAddBlock} className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium text-gray-700 sm:col-span-2">
                  Listing
                  <select required value={blockListingId} onChange={(event) => setBlockListingId(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-[#12231d] focus:border-[#ec1561] focus:outline-none focus:ring-2 focus:ring-[#ec1561]/20">
                    {listings.map((listing) => <option key={listing.id} value={listing.id}>{listing.title}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium text-gray-700">
                  Start date
                  <input required type="date" min={todayKey} value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#12231d] focus:border-[#ec1561] focus:outline-none focus:ring-2 focus:ring-[#ec1561]/20" />
                </label>
                <label className="text-sm font-medium text-gray-700">
                  End date
                  <input required type="date" min={startDate || todayKey} value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#12231d] focus:border-[#ec1561] focus:outline-none focus:ring-2 focus:ring-[#ec1561]/20" />
                </label>
                <label className="text-sm font-medium text-gray-700 sm:col-span-2">
                  Reason <span className="font-normal text-gray-400">(optional)</span>
                  <input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={120} placeholder="Maintenance, personal use…" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#12231d] placeholder:text-gray-400 focus:border-[#ec1561] focus:outline-none focus:ring-2 focus:ring-[#ec1561]/20" />
                </label>
                <button type="submit" disabled={saving || listings.length === 0 || !startDate || !endDate || startDate >= endDate} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#12231d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#243c34] disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2">
                  {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving</> : <><CalendarDays className="h-4 w-4" />Block dates</>}
                </button>
              </form>
            </div>

            <div className="space-y-3 rounded-xl bg-white p-5 shadow-sm">
              <div>
                <h2 className="font-semibold text-[#12231d]">Blocked dates this month</h2>
                <p className="mt-1 text-sm text-gray-500">Remove a block to make those dates bookable again.</p>
              </div>
              {visibleBlocks.length === 0 ? (
                <p className="py-4 text-sm text-gray-500">No blocked dates for this view.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {visibleBlocks.map((block) => {
                    const isRemoving = removingId === block.id;
                    return (
                      <li key={block.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[#12231d]">{listings.find((listing) => listing.id === block.listing_id)?.title}</p>
                          <p className="text-xs text-gray-500">{formatDate(block.start_date)} to {formatDate(block.end_date)}{block.reason ? ` · ${block.reason}` : ""}</p>
                        </div>
                        <button type="button" disabled={Boolean(removingId)} onClick={() => void handleRemoveBlock(block.id)} aria-label="Remove blocked dates" title="Remove blocked dates" className="shrink-0 rounded-md p-2 text-gray-500 hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:opacity-50">
                          {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}