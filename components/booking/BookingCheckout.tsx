"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AvailabilityCalendar } from "@/components/appartmentDetails/AvailabilityCalendar";
import { calculateBookingPrice, type BookingPrice } from "@/app/lib/booking/pricing";
import { getStayNights } from "@/app/lib/booking/availability";
import { supabase } from "@/app/lib/supabase/client";

interface ListingCheckoutData {
  id: string;
  title: string;
  price_per_night: number | string;
  platform_fee_per_night: number | string | null;
  additional_charges: unknown;
  max_guests: number;
  min_nights: number | null;
  house_rules: string[] | null;
  booking_terms: string | null;
  cancellation_policy: string | null;
}

type PaymentMethod = "mpesa" | "card";

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(amount);
}

function displayDate(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function checkoutStorageKey(listingId: string, checkIn: string, checkOut: string) {
  return `dominium-checkout:${listingId}:${checkIn}:${checkOut}`;
}

function getOrCreateSessionValue(key: string, suffix: string, create: () => string) {
  const storageKey = `${key}:${suffix}`;
  const existing = sessionStorage.getItem(storageKey);
  if (existing) return existing;
  const value = create();
  sessionStorage.setItem(storageKey, value);
  return value;
}

export default function BookingCheckout({
  listingId,
  checkIn,
  checkOut,
  guests,
  kids,
  pets,
  resumeBookingId,
}: {
  listingId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  kids: number;
  pets: number;
  resumeBookingId?: string;
}) {
  const router = useRouter();
  const [listing, setListing] = useState<ListingCheckoutData | null>(null);
  const [resumePrice, setResumePrice] = useState<BookingPrice | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mpesa");
  const [agreed, setAgreed] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [signinOpen, setSigninOpen] = useState(false);
  const [signinEmail, setSigninEmail] = useState("");
  const [signinPassword, setSigninPassword] = useState("");
  const [signinError, setSigninError] = useState<string | null>(null);
  const [signinLoading, setSigninLoading] = useState(false);
  const [checkoutDetailsLoaded, setCheckoutDetailsLoaded] = useState(false);
  const [tripCheckIn, setTripCheckIn] = useState(checkIn);
  const [tripCheckOut, setTripCheckOut] = useState(checkOut);
  const [tripGuests, setTripGuests] = useState(guests);
  const [tripKids, setTripKids] = useState(kids);
  const [tripPets, setTripPets] = useState(pets);
  const [tripEditorOpen, setTripEditorOpen] = useState(false);
  const [bookedDateRanges, setBookedDateRanges] = useState<Array<{ start: string; end: string }>>([]);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  const nights = getStayNights(tripCheckIn, tripCheckOut);
  const currentListingPrice = listing
    ? calculateBookingPrice({
        nightlyRate: listing.price_per_night,
        platformFeePerNight: listing.platform_fee_per_night,
        additionalCharges: listing.additional_charges,
        nights,
      })
    : null;
  const price = resumePrice ?? currentListingPrice;
  const policiesUrl = `/apartments/${listingId}`;
  const sessionKey = checkoutStorageKey(listingId, checkIn, checkOut);
  const tripSessionKey = checkoutStorageKey(listingId, tripCheckIn, tripCheckOut);

  useEffect(() => {
    let alive = true;
    async function loadCheckout() {
      try {
        const cachedDetails = sessionStorage.getItem(`${sessionKey}:details`);
        if (cachedDetails) {
          const saved = JSON.parse(cachedDetails) as {
            fullName?: string;
            phone?: string;
            email?: string;
            paymentMethod?: PaymentMethod;
            agreed?: boolean;
          };
          setFullName(saved.fullName ?? "");
          setPhone(saved.phone ?? "");
          setEmail(saved.email ?? "");
          if (saved.paymentMethod === "mpesa" || saved.paymentMethod === "card") setPaymentMethod(saved.paymentMethod);
          setAgreed(saved.agreed === true);
        }
      } catch {
        sessionStorage.removeItem(`${sessionKey}:details`);
      }

      const [{ data, error }, { data: authData }] = await Promise.all([
        supabase
          .from("listings")
          .select("id, title, price_per_night, platform_fee_per_night, additional_charges, max_guests, min_nights, house_rules, booking_terms, cancellation_policy")
          .eq("id", listingId)
          .eq("status", "published")
          .maybeSingle(),
        supabase.auth.getUser(),
      ]);
      if (!alive) return;
      if (error || !data) {
        setFormError("This listing is no longer available. Return to the listing and choose another stay.");
      } else {
        setListing(data as ListingCheckoutData);
      }

      const user = authData.user;
      setUserId(user?.id ?? null);
      if (user) {
        setEmail(user.email ?? "");
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("id", user.id)
          .maybeSingle();
        if (!alive) return;
        setFullName(profile?.full_name ?? "");
        setPhone(profile?.phone ?? "");
      }

      if (resumeBookingId) {
        try {
          const response = await fetch(`/api/bookings/${encodeURIComponent(resumeBookingId)}`, { cache: "no-store" });
          const savedBooking = await response.json();
          if (!alive) return;
          if (!response.ok || savedBooking.status !== "pending" || savedBooking.listingId !== listingId) {
            setFormError(savedBooking.error ?? "This booking is no longer awaiting payment.");
          } else {
            setFullName(savedBooking.guestName ?? "");
            setPhone(savedBooking.guestPhone ?? "");
            setEmail(savedBooking.guestEmail ?? "");
            setResumePrice({
              nights,
              nightlyRate: nights > 0 ? Number(savedBooking.hostBaseAmount) / nights : 0,
              subtotal: Number(savedBooking.hostBaseAmount),
              serviceFee: Number(savedBooking.serviceFee),
              additionalFees: Number(savedBooking.additionalFees),
              additionalChargeLines: [],
              total: Number(savedBooking.totalAmount),
              hostPayout: Number(savedBooking.hostPayout),
            });
          }
        } catch {
          if (alive) setFormError("We couldn't reload this booking. Return to your payments and try again.");
        }
      }
      setCheckoutDetailsLoaded(true);
      setLoading(false);
    }

    void loadCheckout();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      if (session?.user?.email) setEmail((current) => current || session.user.email || "");
    });
    return () => {
      alive = false;
      authListener.subscription.unsubscribe();
    };
  }, [listingId, resumeBookingId, sessionKey, nights]);

  useEffect(() => {
    if (!checkoutDetailsLoaded) return;
    sessionStorage.setItem(`${sessionKey}:details`, JSON.stringify({
      fullName,
      phone,
      email,
      paymentMethod,
      agreed,
    }));
  }, [agreed, checkoutDetailsLoaded, email, fullName, paymentMethod, phone, sessionKey]);

  useEffect(() => {
    if (!tripEditorOpen || resumeBookingId) return;
    let ignore = false;
    async function loadAvailability() {
      setAvailabilityLoading(true);
      setAvailabilityError(null);
      try {
        const response = await fetch(`/api/listings/${encodeURIComponent(listingId)}/availability`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok || !Array.isArray(payload.ranges)) {
          throw new Error(payload.error ?? "Availability is temporarily unavailable.");
        }
        if (!ignore) setBookedDateRanges(payload.ranges);
      } catch (error) {
        if (!ignore) setAvailabilityError(error instanceof Error ? error.message : "Availability is temporarily unavailable.");
      } finally {
        if (!ignore) setAvailabilityLoading(false);
      }
    }
    void loadAvailability();
    return () => { ignore = true; };
  }, [listingId, resumeBookingId, tripEditorOpen]);

  async function signInOnCheckout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSigninLoading(true);
    setSigninError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: signinEmail.trim(),
      password: signinPassword,
    });
    setSigninLoading(false);
    if (error) {
      setSigninError("We couldn't sign you in. Check your details and try again.");
      return;
    }
    setSigninPassword("");
    setSigninOpen(false);
  }

  async function pay() {
    setTermsError(!agreed);
    setFormError(null);
    if (!agreed) return;
    if (!listing || !price || !tripCheckIn || !tripCheckOut || nights < (listing.min_nights ?? 1)) {
      setFormError("Choose valid dates for this stay.");
      return;
    }
    if (!resumeBookingId && (!fullName.trim() || !/^\+?[\d][\d\s()-]{6,19}$/.test(phone.trim()))) {
      setFormError("Enter your name and a valid phone number.");
      return;
    }
    if (!resumeBookingId && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setFormError("Enter a valid email address.");
      return;
    }

    setIsPaying(true);
    try {
      const confirmationToken = getOrCreateSessionValue(tripSessionKey, "confirmation-token", randomToken);
      let bookingId = resumeBookingId;
      if (!bookingId) {
        const idempotencyKey = getOrCreateSessionValue(tripSessionKey, "booking-key", () => `${crypto.randomUUID()}-${crypto.randomUUID()}`);
        const bookingResponse = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            listingId,
            checkIn: tripCheckIn,
            checkOut: tripCheckOut,
            guests: tripGuests,
            children: tripKids,
            pets: tripPets,
            fullName,
            email,
            phone,
            agreedToTerms: true,
            paymentMethod,
            idempotencyKey,
            confirmationToken,
          }),
        });
        const booking = await bookingResponse.json();
        if (!bookingResponse.ok || !booking.bookingId) throw new Error(booking.error || "We couldn't hold those dates.");
        bookingId = booking.bookingId;
      }

      const paymentAttemptKey = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
      const paymentResponse = await fetch("/api/payments/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          paymentMethod,
          idempotencyKey: paymentAttemptKey,
          confirmationToken,
        }),
      });
      const payment = await paymentResponse.json();
      if (paymentResponse.status === 202 && payment.processing) {
        router.push(`/booking/${bookingId}/confirmation`);
        return;
      }
      if (!paymentResponse.ok || !payment.accessCode || !payment.authorizationUrl) {
        throw new Error(payment.error || "Secure payment could not be opened. Your dates are held for 10 minutes. Try again.");
      }

      const { default: PaystackPop } = await import("@paystack/inline-js");
      const paystack = new PaystackPop();
      let popupLoaded = false;
      let transaction: { id: string } | null = null;
      transaction = paystack.resumeTransaction(payment.accessCode, {
        onLoad: () => {
          popupLoaded = true;
        },
        onSuccess: () => {
          router.push(`/booking/${bookingId}/confirmation`);
        },
        onCancel: () => {
          setFormError("Payment was cancelled. Your dates are held for 10 minutes. Try again when you're ready.");
        },
        onError: () => {
          setFormError("Payment couldn't be opened. Your dates are held for 10 minutes. Try again.");
        },
      });
      window.setTimeout(() => {
        if (popupLoaded) return;
        if (transaction) paystack.cancelTransaction(transaction);
        window.location.assign(payment.authorizationUrl);
      }, 10_000);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "We couldn't reach the payment service. Try again.");
    } finally {
      setIsPaying(false);
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-xl animate-pulse space-y-4 p-5" aria-busy="true" aria-label="Loading checkout"><div className="h-6 w-48 rounded bg-gray-200" /><div className="h-24 rounded bg-gray-200" /><div className="h-48 rounded bg-gray-200" /></div>;
  }

  if (!listing || !price) {
    return <p role="alert" className="mx-auto max-w-xl p-5 text-sm text-red-700">{formError ?? "This listing isn't available."}</p>;
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-10 sm:px-6">
      <section aria-labelledby="trip-summary-title" className="border-b border-[#E9E6DD] py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id="trip-summary-title" className="font-semibold text-[#1B1A2E]">{listing.title}</h2>
            <p className="mt-1 text-sm text-[#3A3856]">
              {displayDate(tripCheckIn)} to {displayDate(tripCheckOut)} · {nights} night{nights === 1 ? "" : "s"} · {tripGuests - tripKids} adult{tripGuests - tripKids === 1 ? "" : "s"}{tripKids ? ` · ${tripKids} kid${tripKids === 1 ? "" : "s"}` : ""}{tripPets ? ` · ${tripPets} pet${tripPets === 1 ? "" : "s"}` : ""}
            </p>
          </div>
          {!resumeBookingId && (
            <button
              type="button"
              aria-expanded={tripEditorOpen}
              aria-controls="checkout-trip-editor"
              onClick={() => setTripEditorOpen((open) => !open)}
              className="min-h-11 shrink-0 py-2 text-sm font-semibold text-[#1769AA] underline underline-offset-2"
            >
              {tripEditorOpen ? "Done" : "Edit"}
            </button>
          )}
        </div>
        {resumeBookingId && <p className="mt-2 text-xs text-[#6B6A78]">Dates and guests are fixed while this payment hold is active.</p>}
        {tripEditorOpen && !resumeBookingId && (
          <div id="checkout-trip-editor" className="mt-4 space-y-3 rounded-md border border-[#E9E6DD] p-3">
            {availabilityLoading && <p className="text-sm text-[#3A3856]" role="status">Checking dates…</p>}
            {availabilityError && <p className="text-sm text-red-700" role="alert">{availabilityError}</p>}
            {!availabilityError && !availabilityLoading && (
              <AvailabilityCalendar
                key={`${tripCheckIn}:${tripCheckOut}`}
                bookedDateRanges={bookedDateRanges}
                minNights={listing.min_nights ?? 1}
                initialCheckIn={tripCheckIn}
                initialCheckOut={tripCheckOut}
                onDateRangeSelect={(nextCheckIn, nextCheckOut) => {
                  const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                  setTripCheckIn(dateKey(nextCheckIn));
                  setTripCheckOut(dateKey(nextCheckOut));
                  setTripEditorOpen(false);
                }}
              />
            )}
            <div className="grid grid-cols-3 gap-2">
              <label className="text-xs font-medium text-[#3A3856]">
                Adults
                <select
                  value={tripGuests - tripKids}
                  onChange={(event) => setTripGuests(Number(event.target.value) + tripKids)}
                  className="mt-1 min-h-11 w-full rounded-md border border-[#DDE0E4] bg-white px-2 text-base text-[#1B1A2E] shadow-[0_1px_3px_rgba(31,41,55,0.05)] transition-shadow focus:border-[#9BB9D2] focus:outline-none focus:ring-2 focus:ring-[#1769AA]/15"
                >
                  {Array.from({ length: Math.max(1, Number(listing.max_guests) - tripKids) }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count}</option>)}
                </select>
              </label>
              <label className="text-xs font-medium text-[#3A3856]">
                Kids
                <select
                  value={tripKids}
                  onChange={(event) => {
                    const nextKids = Number(event.target.value);
                    setTripKids(nextKids);
                    setTripGuests(tripGuests - tripKids + nextKids);
                  }}
                  className="mt-1 min-h-11 w-full rounded-md border border-[#DDE0E4] bg-white px-2 text-base text-[#1B1A2E] shadow-[0_1px_3px_rgba(31,41,55,0.05)] transition-shadow focus:border-[#9BB9D2] focus:outline-none focus:ring-2 focus:ring-[#1769AA]/15"
                >
                  {Array.from({ length: Math.max(0, Number(listing.max_guests) - (tripGuests - tripKids)) + 1 }, (_, index) => index).map((count) => <option key={count} value={count}>{count}</option>)}
                </select>
              </label>
              <label className="text-xs font-medium text-[#3A3856]">
                Pets
                <select
                  value={tripPets}
                  onChange={(event) => setTripPets(Number(event.target.value))}
                  className="mt-1 min-h-11 w-full rounded-md border border-[#DDE0E4] bg-white px-2 text-base text-[#1B1A2E] shadow-[0_1px_3px_rgba(31,41,55,0.05)] transition-shadow focus:border-[#9BB9D2] focus:outline-none focus:ring-2 focus:ring-[#1769AA]/15"
                >
                  {Array.from({ length: 11 }, (_, count) => count).map((count) => <option key={count} value={count}>{count}</option>)}
                </select>
              </label>
            </div>
            <p className="text-xs text-[#6B6A78]">Pet policies are set by the host; confirm pets are welcome before paying.</p>
          </div>
        )}
      </section>

      <section aria-label="Price breakdown" className="border-b border-[#E9E6DD] py-3">
        <dl className="space-y-3 text-sm text-[#3A3856]">
          <div className="flex justify-between gap-4">
            <dt>{formatMoney(price.nightlyRate)} × {nights} night{nights === 1 ? "" : "s"}</dt>
            <dd>{formatMoney(price.subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Service fee</dt>
            <dd>{formatMoney(price.serviceFee)}</dd>
          </div>
          {price.additionalChargeLines.map((charge, index) => (
            <div key={`${charge.name}-${charge.frequency}-${index}`} className="flex justify-between gap-4">
              <dt>{charge.name}</dt>
              <dd>{formatMoney(charge.total)}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-4 border-t border-[#E9E6DD] pt-3 text-base font-semibold text-[#1B1A2E]">
            <dt>Total</dt>
            <dd>{formatMoney(price.total)}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="guest-details-title" className="border-b border-[#E9E6DD] py-3">
        <h2 id="guest-details-title" className="text-base font-semibold text-[#1B1A2E]">Your details</h2>
        <div className="mt-4 grid gap-4">
          <label className="text-sm font-medium text-[#3A3856]">
            Name
            <input value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" className="mt-1 block min-h-12 w-full rounded-md border border-[#DDE0E4] bg-white px-3 text-base text-[#1B1A2E] shadow-[0_1px_3px_rgba(31,41,55,0.05)] transition-shadow focus:border-[#9BB9D2] focus:outline-none focus:ring-2 focus:ring-[#1769AA]/15" />
          </label>
          <label className="text-sm font-medium text-[#3A3856]">
            Phone
            <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" className="mt-1 block min-h-12 w-full rounded-md border border-[#DDE0E4] bg-white px-3 text-base text-[#1B1A2E] shadow-[0_1px_3px_rgba(31,41,55,0.05)] transition-shadow focus:border-[#9BB9D2] focus:outline-none focus:ring-2 focus:ring-[#1769AA]/15" />
          </label>
          <label className="text-sm font-medium text-[#3A3856]">
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="mt-1 block min-h-12 w-full rounded-md border border-[#DDE0E4] bg-white px-3 text-base text-[#1B1A2E] shadow-[0_1px_3px_rgba(31,41,55,0.05)] transition-shadow focus:border-[#9BB9D2] focus:outline-none focus:ring-2 focus:ring-[#1769AA]/15" />
          </label>
        </div>
        {!userId && (
          <p className="mt-3 text-sm text-[#3A3856]">
            Already have an account?{" "}
            <button type="button" onClick={() => { setSigninEmail(email); setSigninOpen(true); }} className="min-h-11 font-semibold text-[#1769AA] underline underline-offset-2">Sign in</button>
          </p>
        )}
      </section>

      <section aria-labelledby="payment-method-title" className="border-b border-[#E9E6DD] py-2">
        <h2 id="payment-method-title" className="text-base font-semibold text-[#1B1A2E]">Pay with</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {(["mpesa", "card"] as const).map((method) => (
            <label key={method} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-md border px-3 ${paymentMethod === method ? "border-[#1769AA] ring-1 ring-[#1769AA]" : "border-[#B8B7B2]"}`}>
              <input type="radio" name="payment-method" value={method} checked={paymentMethod === method} onChange={() => setPaymentMethod(method)} className="size-5 accent-[#1769AA]" />
              <span className="font-medium text-[#1B1A2E]">{method === "mpesa" ? "M-Pesa" : "Card"}</span>
            </label>
          ))}
        </div>
        {paymentMethod === "mpesa" && <p className="mt-3 text-sm text-[#3A3856]">You&apos;ll enter your M-Pesa number next.</p>}
      </section>

      <section className="py-5">
        <label className="flex min-h-11 items-start gap-3 text-sm leading-5 text-[#3A3856]">
          <input type="checkbox" checked={agreed} onChange={(event) => { setAgreed(event.target.checked); setTermsError(false); }} className="mt-0.5 size-5 shrink-0 accent-[#1769AA]" />
          <span>
            I agree to the{" "}
            <Link href={`${policiesUrl}#house-rules`} className="font-medium text-[#1769AA] underline">house rules</Link>,{" "}
            <Link href="/legal/refund-cancellation-policy" className="font-medium text-[#1769AA] underline">cancellation policy</Link>, and{" "}
            <Link href={`${policiesUrl}#booking-terms`} className="font-medium text-[#1769AA] underline">booking terms</Link>.
          </span>
        </label>
        {termsError && <p role="alert" className="mt-2 text-sm text-red-700">Accept the house rules, cancellation policy, and booking terms to continue.</p>}
      </section>

      {formError && <p role="alert" className="mb-3 text-sm text-red-700">{formError}</p>}
      <button type="button" onClick={() => void pay()} disabled={isPaying} className="min-h-14 w-full cursor-pointer rounded-4xl bg-[#d61a6b] px-4 py-3 text-base font-semibold text-white disabled:cursor-wait disabled:opacity-60">
        {isPaying ? "Opening secure payment…" : `Pay ${formatMoney(price.total)}`}
      </button>
      <p className="mt-3 text-center text-xs text-[#006400]">Secured by Paystack</p>

      {signinOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="signin-title" className="w-full max-w-md rounded-t-xl bg-white p-6 shadow-xl sm:rounded-xl">
            <h2 id="signin-title" className="text-lg font-semibold text-[#1B1A2E]">Sign in to Dominium</h2>
            <p className="mt-1 text-sm text-[#3A3856]">Your trip details will stay on this page.</p>
            <form onSubmit={(event) => void signInOnCheckout(event)} className="mt-5 space-y-4">
              <label className="block text-sm font-medium text-[#3A3856]">Email<input type="email" required value={signinEmail} onChange={(event) => setSigninEmail(event.target.value)} autoComplete="email" className="mt-1 block min-h-12 w-full rounded-md border border-[#DDE0E4] bg-white px-3 text-base shadow-[0_1px_3px_rgba(31,41,55,0.05)] transition-shadow focus:border-[#9BB9D2] focus:outline-none focus:ring-2 focus:ring-[#1769AA]/15" /></label>
              <label className="block text-sm font-medium text-[#3A3856]">Password<input type="password" required value={signinPassword} onChange={(event) => setSigninPassword(event.target.value)} autoComplete="current-password" className="mt-1 block min-h-12 w-full rounded-md border border-[#DDE0E4] bg-white px-3 text-base shadow-[0_1px_3px_rgba(31,41,55,0.05)] transition-shadow focus:border-[#9BB9D2] focus:outline-none focus:ring-2 focus:ring-[#1769AA]/15" /></label>
              {signinError && <p role="alert" className="text-sm text-red-700">{signinError}</p>}
              <button type="submit" disabled={signinLoading} className="min-h-12 w-full rounded-md bg-[#1B1A2E] px-4 font-semibold text-white">{signinLoading ? "Signing in…" : "Sign in"}</button>
              <button type="button" onClick={() => setSigninOpen(false)} className="min-h-12 w-full rounded-md border border-[#B8B7B2] px-4 font-medium text-[#1B1A2E]">Continue as guest</button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}