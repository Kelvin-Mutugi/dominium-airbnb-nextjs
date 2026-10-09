"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LoaderCircle,
  LockKeyhole,
  Smartphone,
} from "lucide-react";
import { AvailabilityCalendar } from "@/components/appartmentDetails/AvailabilityCalendar";
import {
  calculateBookingPrice,
  normalizeGuestPriceSnapshot,
  type BookingPrice,
} from "@/app/lib/booking/pricing";
import { normalizeListingAdditionalCharges } from "@/app/lib/listing-charges";
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

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(amount);
}

function displayDate(value: string): string {
  if (!value) return "Add date";
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
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function checkoutStorageKey(
  listingId: string,
  checkIn: string,
  checkOut: string,
) {
  return `dominium-checkout:${listingId}:${checkIn}:${checkOut}`;
}

function getOrCreateSessionValue(
  key: string,
  suffix: string,
  create: () => string,
) {
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
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [agreed, setAgreed] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [signinOpen, setSigninOpen] = useState(false);
  const [signinEmail, setSigninEmail] = useState("");
  const [signinPassword, setSigninPassword] = useState("");
  const [signinError, setSigninError] = useState<string | null>(null);
  const [signinLoading, setSigninLoading] = useState(false);
  const [signinGoogleLoading, setSigninGoogleLoading] = useState(false);
  const [checkoutDetailsLoaded, setCheckoutDetailsLoaded] = useState(false);
  const [tripCheckIn, setTripCheckIn] = useState(checkIn);
  const [tripCheckOut, setTripCheckOut] = useState(checkOut);
  const [tripGuests, setTripGuests] = useState(guests);
  const [tripKids, setTripKids] = useState(kids);
  const [tripPets, setTripPets] = useState(pets);
  const [tripEditorOpen, setTripEditorOpen] = useState(false);
  const [bookedDateRanges, setBookedDateRanges] = useState<
    Array<{ start: string; end: string }>
  >([]);
  const [availabilityError, setAvailabilityError] = useState<string | null>(
    null,
  );
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  const nights = getStayNights(tripCheckIn, tripCheckOut);
  const currentListingPrice = listing
    ? calculateBookingPrice({
        nightlyRate: listing.price_per_night,
        platformFeePerNight: listing.platform_fee_per_night,
        additionalCharges: listing.additional_charges,
        nights,
        selectedExtras,
      })
    : null;
  const optionalExtras = listing
    ? normalizeListingAdditionalCharges(listing.additional_charges).filter(
        (charge) => charge.required === false,
      )
    : [];
  const price = resumePrice ?? currentListingPrice;
  const policiesUrl = `/apartments/${listingId}`;
  const sessionKey = checkoutStorageKey(listingId, checkIn, checkOut);
  const tripSessionKey = checkoutStorageKey(
    listingId,
    tripCheckIn,
    tripCheckOut,
  );
  const checkoutParams = new URLSearchParams({
    checkIn: tripCheckIn,
    checkOut: tripCheckOut,
    guests: String(tripGuests),
    children: String(tripKids),
    pets: String(tripPets),
  });
  if (resumeBookingId) checkoutParams.set("bookingId", resumeBookingId);
  const checkoutReturnUrl = `/booking/${encodeURIComponent(listingId)}?${checkoutParams.toString()}`;
  const signupUrl = `/signup?redirectTo=${encodeURIComponent(checkoutReturnUrl)}`;

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
            selectedExtras?: string[];
            agreed?: boolean;
          };
          setFullName(saved.fullName ?? "");
          setPhone(saved.phone ?? "");
          setEmail(saved.email ?? "");
          setSelectedExtras(
            Array.isArray(saved.selectedExtras)
              ? saved.selectedExtras.filter(
                  (item): item is string => typeof item === "string",
                )
              : [],
          );
          setAgreed(saved.agreed === true);
        }
      } catch {
        sessionStorage.removeItem(`${sessionKey}:details`);
      }

      const [{ data, error }, { data: authData }] = await Promise.all([
        supabase
          .from("listings")
          .select(
            "id, title, price_per_night, platform_fee_per_night, additional_charges, max_guests, min_nights, house_rules, booking_terms, cancellation_policy",
          )
          .eq("id", listingId)
          .eq("status", "published")
          .maybeSingle(),
        supabase.auth.getUser(),
      ]);
      if (!alive) return;
      if (error || !data) {
        setFormError(
          "This listing is no longer available. Return to the listing and choose another stay.",
        );
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
          const response = await fetch(
            `/api/bookings/${encodeURIComponent(resumeBookingId)}`,
            { cache: "no-store" },
          );
          const savedBooking = await response.json();
          if (!alive) return;
          if (
            !response.ok ||
            savedBooking.status !== "pending" ||
            savedBooking.listingId !== listingId
          ) {
            setFormError(
              savedBooking.error ??
                "This booking is no longer awaiting payment.",
            );
          } else {
            setFullName(savedBooking.guestName ?? "");
            setPhone(savedBooking.guestPhone ?? "");
            setEmail(savedBooking.guestEmail ?? "");
            const snapshot = normalizeGuestPriceSnapshot(
              savedBooking.pricingSnapshot,
            );
            const snapshotLines = snapshot.line_items;
            const guestNightlySubtotal = Number(
              snapshot.totals.guest_nightly_subtotal ??
                Number(savedBooking.totalAmount) -
                  Number(savedBooking.legacyAdditionalFees ?? 0),
            );
            setResumePrice({
              nights,
              nightlyRate: nights > 0 ? guestNightlySubtotal / nights : 0,
              hostSubtotal: 0,
              subtotal: guestNightlySubtotal,
              serviceFee: 0,
              additionalFees: Number(
                snapshot.totals.host_charges ??
                  savedBooking.legacyAdditionalFees ??
                  0,
              ),
              roundingAdjustment: Number(
                snapshot.totals.rounding_adjustment ?? 0,
              ),
              additionalChargeLines: snapshotLines
                .filter((line) => line.type === "host_charge")
                .map((line) => ({
                  name: line.name,
                  amount: Number(line.unit_amount ?? 0),
                  frequency:
                    line.frequency === "per_night"
                      ? "per_night"
                      : "per_booking",
                  required: line.required !== false,
                  total: Number(line.total ?? 0),
                })),
              total: Number(
                snapshot.totals.guest_total ?? savedBooking.totalAmount,
              ),
              hostPayout: 0,
            });
          }
        } catch {
          if (alive)
            setFormError(
              "We couldn't reload this booking. Return to your payments and try again.",
            );
        }
      }
      setCheckoutDetailsLoaded(true);
      setLoading(false);
    }

    void loadCheckout();
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUserId(session?.user?.id ?? null);
        if (session?.user?.email)
          setEmail((current) => current || session.user.email || "");
      },
    );
    return () => {
      alive = false;
      authListener.subscription.unsubscribe();
    };
  }, [listingId, resumeBookingId, sessionKey, nights]);

  useEffect(() => {
    if (!checkoutDetailsLoaded) return;
    sessionStorage.setItem(
      `${sessionKey}:details`,
      JSON.stringify({
        fullName,
        phone,
        email,
        selectedExtras,
        agreed,
      }),
    );
  }, [
    agreed,
    checkoutDetailsLoaded,
    email,
    fullName,
    selectedExtras,
    phone,
    sessionKey,
  ]);

  useEffect(() => {
    if (!tripEditorOpen || resumeBookingId) return;
    let ignore = false;
    async function loadAvailability() {
      setAvailabilityLoading(true);
      setAvailabilityError(null);
      try {
        const response = await fetch(
          `/api/listings/${encodeURIComponent(listingId)}/availability`,
          { cache: "no-store" },
        );
        const payload = await response.json();
        if (!response.ok || !Array.isArray(payload.ranges)) {
          throw new Error(
            payload.error ?? "Availability is temporarily unavailable.",
          );
        }
        if (!ignore) setBookedDateRanges(payload.ranges);
      } catch (error) {
        if (!ignore)
          setAvailabilityError(
            error instanceof Error
              ? error.message
              : "Availability is temporarily unavailable.",
          );
      } finally {
        if (!ignore) setAvailabilityLoading(false);
      }
    }
    void loadAvailability();
    return () => {
      ignore = true;
    };
  }, [listingId, resumeBookingId, tripEditorOpen]);

  async function signInWithGoogleOnCheckout() {
    setSigninError(null);
    setSigninGoogleLoading(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(checkoutReturnUrl)}`,
      },
    });

    if (oauthError) {
      setSigninError(oauthError.message);
      setSigninGoogleLoading(false);
    }
  }

  async function signInOnCheckout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSigninLoading(true);
    setSigninError(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: signinEmail.trim(),
      password: signinPassword,
    });
    setSigninLoading(false);
    if (error) {
      setSigninError(
        "We couldn't sign you in. Check your details and try again.",
      );
      return;
    }
    setUserId(data.user.id);
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profile?.full_name) setFullName(profile.full_name);
    if (profile?.phone) setPhone(profile.phone);
    if (data.user.email) setEmail(data.user.email);
    setSigninPassword("");
    setSigninOpen(false);
  }

  async function pay() {
    setTermsError(!agreed);
    setFormError(null);
    if (!userId) {
      setFormError("Sign in or create an account before booking.");
      setSigninEmail(email);
      setSigninOpen(true);
      return;
    }
    if (!agreed) return;
    if (
      !listing ||
      !price ||
      !tripCheckIn ||
      !tripCheckOut ||
      nights < (listing.min_nights ?? 1)
    ) {
      setFormError("Choose valid dates for this stay.");
      return;
    }
    if (
      !resumeBookingId &&
      (!fullName.trim() || !/^\+?[\d][\d\s()-]{6,19}$/.test(phone.trim()))
    ) {
      setFormError("Enter your name and a valid phone number.");
      return;
    }
    if (!resumeBookingId && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setFormError("Enter a valid email address.");
      return;
    }

    setIsPaying(true);
    let keepProcessingState = false;
    try {
      const confirmationToken = getOrCreateSessionValue(
        tripSessionKey,
        "confirmation-token",
        randomToken,
      );
      let bookingId = resumeBookingId;
      if (!bookingId) {
        const idempotencyKey = getOrCreateSessionValue(
          tripSessionKey,
          "booking-key",
          () => `${crypto.randomUUID()}-${crypto.randomUUID()}`,
        );
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
            selectedExtras,
            agreedToTerms: true,
            paymentMethod: "mpesa",
            idempotencyKey,
            confirmationToken,
          }),
        });
        const booking = await bookingResponse.json();
        if (!bookingResponse.ok || !booking.bookingId)
          throw new Error(booking.error || "We couldn't hold those dates.");
        bookingId = booking.bookingId;
      }

      const paymentAttemptKey = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
      const paymentResponse = await fetch("/api/payments/daraja/stk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          idempotencyKey: paymentAttemptKey,
          confirmationToken,
        }),
      });
      const payment = await paymentResponse.json();
      if (paymentResponse.status === 202 && payment.processing) {
        router.push(`/booking/${bookingId}/confirmation`);
        return;
      }
      if (!paymentResponse.ok || !payment.accepted) {
        throw new Error(
          payment.error ||
            "We couldn't send the M-Pesa prompt. Your dates are held for 10 minutes. Try again.",
        );
      }

      keepProcessingState = true;
      router.push(`/booking/${bookingId}/confirmation`);
    } catch (error) {
      setIsPaying(false);
      setFormError(
        error instanceof Error
          ? error.message
          : "We couldn't reach the payment service. Try again.",
      );
    } finally {
      if (!keepProcessingState) setIsPaying(false);
    }
  }

  if (loading) {
    return (
      <div
        className="mx-auto max-w-xl animate-pulse space-y-4 p-5"
        aria-busy="true"
        aria-label="Loading checkout"
      >
        <div className="h-6 w-48 rounded bg-gray-200" />
        <div className="h-24 rounded bg-gray-200" />
        <div className="h-48 rounded bg-gray-200" />
      </div>
    );
  }

  if (!listing || !price) {
    return (
      <p role="alert" className="mx-auto max-w-xl p-5 text-sm text-red-700">
        {formError ?? "This listing isn't available."}
      </p>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl rounded-xl bg-white px-4 py-4 pb-10 shadow-[0_4px_24px_rgba(31,41,55,0.08)] sm:px-6 sm:py-6">
      <section
        aria-labelledby="trip-summary-title"
        className="border-b border-[#E9E6DD] py-2"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2
              id="trip-summary-title"
              className="font-semibold text-[#1B1A2E]"
            >
              {listing.title}
            </h2>
            <p className="mt-1 text-sm text-[#3A3856]">
              {displayDate(tripCheckIn)} to {displayDate(tripCheckOut)} ·{" "}
              {nights} night{nights === 1 ? "" : "s"} · {tripGuests - tripKids}{" "}
              adult{tripGuests - tripKids === 1 ? "" : "s"}
              {tripKids ? ` · ${tripKids} kid${tripKids === 1 ? "" : "s"}` : ""}
              {tripPets ? ` · ${tripPets} pet${tripPets === 1 ? "" : "s"}` : ""}
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
        {resumeBookingId && (
          <p className="mt-2 text-xs text-[#6B6A78]">
            Dates and guests are fixed while this payment hold is active.
          </p>
        )}
        {tripEditorOpen && !resumeBookingId && (
          <div
            id="checkout-trip-editor"
            className="mt-4 space-y-3 rounded-md border border-[#E9E6DD] p-3"
          >
            {availabilityLoading && (
              <p className="text-sm text-[#3A3856]" role="status">
                Checking dates…
              </p>
            )}
            {availabilityError && (
              <p className="text-sm text-red-700" role="alert">
                {availabilityError}
              </p>
            )}
            {!availabilityError && !availabilityLoading && (
              <AvailabilityCalendar
                key={`${tripCheckIn}:${tripCheckOut}`}
                bookedDateRanges={bookedDateRanges}
                minNights={listing.min_nights ?? 1}
                initialCheckIn={tripCheckIn}
                initialCheckOut={tripCheckOut}
                onDatesClear={() => {
                  setTripCheckIn("");
                  setTripCheckOut("");
                }}
                onDateRangeSelect={(nextCheckIn, nextCheckOut) => {
                  const dateKey = (date: Date) =>
                    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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
                  onChange={(event) =>
                    setTripGuests(Number(event.target.value) + tripKids)
                  }
                  className="mt-1 min-h-11 w-full rounded-md border border-[#DDE0E4] bg-white px-2 text-base text-[#1B1A2E] shadow-[0_1px_3px_rgba(31,41,55,0.05)] transition-shadow focus:border-[#9BB9D2] focus:outline-none focus:ring-2 focus:ring-[#1769AA]/15"
                >
                  {Array.from(
                    {
                      length: Math.max(
                        1,
                        Number(listing.max_guests) - tripKids,
                      ),
                    },
                    (_, index) => index + 1,
                  ).map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
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
                  {Array.from(
                    {
                      length:
                        Math.max(
                          0,
                          Number(listing.max_guests) - (tripGuests - tripKids),
                        ) + 1,
                    },
                    (_, index) => index,
                  ).map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-[#3A3856]">
                Pets
                <select
                  value={tripPets}
                  onChange={(event) => setTripPets(Number(event.target.value))}
                  className="mt-1 min-h-11 w-full rounded-md border border-[#DDE0E4] bg-white px-2 text-base text-[#1B1A2E] shadow-[0_1px_3px_rgba(31,41,55,0.05)] transition-shadow focus:border-[#9BB9D2] focus:outline-none focus:ring-2 focus:ring-[#1769AA]/15"
                >
                  {Array.from({ length: 11 }, (_, count) => count).map(
                    (count) => (
                      <option key={count} value={count}>
                        {count}
                      </option>
                    ),
                  )}
                </select>
              </label>
            </div>
            <p className="text-xs text-[#6B6A78]">
              Pet policies are set by the host; confirm pets are welcome before
              paying.
            </p>
          </div>
        )}
      </section>

      <section
        aria-label="Price breakdown"
        className="border-b border-[#E9E6DD] py-3"
      >
        {!resumeBookingId && optionalExtras.length > 0 && (
          <fieldset className="mb-4 space-y-2 border-b border-[#E9E6DD] pb-4">
            <legend className="mb-2 text-sm font-semibold text-[#1B1A2E]">
              Optional extras
            </legend>
            {optionalExtras.map((extra) => {
              const checked = selectedExtras.includes(extra.name);
              const extraTotal =
                extra.amount * (extra.frequency === "per_night" ? nights : 1);
              return (
                <label
                  key={extra.name}
                  className="flex cursor-pointer items-start gap-3 text-sm text-[#3A3856]"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) =>
                      setSelectedExtras((current) =>
                        event.target.checked
                          ? [...current, extra.name]
                          : current.filter((name) => name !== extra.name),
                      )
                    }
                    className="mt-0.5 size-4 accent-[#1769AA]"
                  />
                  <span className="flex flex-1 justify-between gap-3">
                    <span>
                      {extra.name}
                      <span className="block text-xs text-[#6B6A78]">
                        {formatMoney(extra.amount)}{" "}
                        {extra.frequency === "per_night"
                          ? "per night"
                          : "per booking"}
                      </span>
                    </span>
                    <span className="shrink-0">{formatMoney(extraTotal)}</span>
                  </span>
                </label>
              );
            })}
          </fieldset>
        )}
        <dl className="space-y-3 text-sm text-[#3A3856]">
          <div className="flex justify-between gap-4">
            <dt>
              {formatMoney(price.nightlyRate)} × {nights} night
              {nights === 1 ? "" : "s"}
            </dt>
            <dd>{formatMoney(price.subtotal)}</dd>
          </div>
          {price.additionalChargeLines.map((charge, index) => (
            <div
              key={`${charge.name}-${charge.frequency}-${index}`}
              className="flex justify-between gap-4"
            >
              <dt>
                {charge.name}
                {charge.required === false ? " · optional" : " · mandatory"}
              </dt>
              <dd>{formatMoney(charge.total)}</dd>
            </div>
          ))}
          {price.roundingAdjustment !== 0 && (
            <div className="flex justify-between gap-4">
              <dt>Whole-shilling adjustment</dt>
              <dd>{formatMoney(price.roundingAdjustment)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4 border-t border-[#E9E6DD] pt-3 text-base font-semibold text-[#1B1A2E]">
            <dt>Total</dt>
            <dd>{formatMoney(price.total)}</dd>
          </div>
        </dl>
      </section>

      <section
        aria-labelledby="guest-details-title"
        className="border-b border-[#E9E6DD] py-3"
      >
        <h2
          id="guest-details-title"
          className="text-base font-semibold text-[#1B1A2E]"
        >
          Your details
        </h2>
        <div className="mt-3 grid gap-3 md:mt-4 md:gap-4">
          <label className="block">
            <span className="sr-only">Full name</span>
            <input
              placeholder="Full name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              autoComplete="name"
              className="block min-h-12 w-full rounded-md border border-[#DDE0E4] bg-white px-3 text-base text-[#1B1A2E] placeholder:text-[#6B6A78] shadow-[0_1px_3px_rgba(31,41,55,0.05)] transition-shadow focus:border-[#9BB9D2] focus:outline-none focus:ring-2 focus:ring-[#1769AA]/15"
            />
          </label>
          <label className="block">
            <span className="sr-only">Phone number</span>
            <input
              type="tel"
              placeholder="Phone number"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              autoComplete="tel"
              className="block min-h-12 w-full rounded-md border border-[#DDE0E4] bg-white px-3 text-base text-[#1B1A2E] placeholder:text-[#6B6A78] shadow-[0_1px_3px_rgba(31,41,55,0.05)] transition-shadow focus:border-[#9BB9D2] focus:outline-none focus:ring-2 focus:ring-[#1769AA]/15"
            />
          </label>
          <label className="block">
            <span className="sr-only">Email address</span>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              className="block min-h-12 w-full rounded-md border border-[#DDE0E4] bg-white px-3 text-base text-[#1B1A2E] placeholder:text-[#6B6A78] shadow-[0_1px_3px_rgba(31,41,55,0.05)] transition-shadow focus:border-[#9BB9D2] focus:outline-none focus:ring-2 focus:ring-[#1769AA]/15"
            />
          </label>
        </div>
        {!userId && (
          <div className="mt-4 rounded-md border border-[#DDE0E4] bg-[#F7F8F8] p-3">
            <p className="text-sm font-semibold text-[#1B1A2E]">
              An account is required to book
            </p>
            <p className="mt-1 text-xs leading-5 text-[#3A3856]">
              Sign in or create an account. Your selected stay details will be
              kept for checkout.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <button
                type="button"
                onClick={() => {
                  setSigninEmail(email);
                  setSigninOpen(true);
                }}
                className="min-h-10 font-semibold text-[#1769AA] underline underline-offset-2"
              >
                Sign in
              </button>
              <Link
                href={signupUrl}
                className="inline-flex min-h-10 items-center font-semibold text-[#1769AA] underline underline-offset-2"
              >
                Create account
              </Link>
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="payment-method-title" className="mt-4 py-2">
        <h2
          id="payment-method-title"
          className="text-base font-semibold text-[#1B1A2E]"
        >
          Payment method
        </h2>
        <div className="mt-3 flex min-h-14 items-center gap-3 rounded-md border border-[#43B02A]/35 bg-[#43B02A]/[0.03] px-3">
          <Smartphone size={18} className="text-[#27821B]" aria-hidden="true" />
          <span className="font-medium text-[#1B1A2E]">M-Pesa</span>
        </div>
        <p className="mt-3 text-sm text-[#3A3856]">
          We&apos;ll send a payment prompt to the phone number above. Enter your M-Pesa PIN on your phone to approve it.
        </p>
      </section>

      <section className="mt-3 border-t border-[#E9E6DD] pt-4">
        <label className="flex min-h-11 items-start gap-3 text-sm leading-5 text-[#3A3856]">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => {
              setAgreed(event.target.checked);
              setTermsError(false);
            }}
            className="mt-0.5 size-5 shrink-0 accent-[#1769AA]"
          />
          <span>
            I agree to the{" "}
            <Link
              href={`${policiesUrl}#house-rules`}
              className="font-medium text-[#1769AA] underline"
            >
              house rules
            </Link>
            ,{" "}
            <Link
              href="/legal/refund-cancellation-policy"
              className="font-medium text-[#1769AA] underline"
            >
              cancellation policy
            </Link>
            , and{" "}
            <Link
              href={`${policiesUrl}#booking-terms`}
              className="font-medium text-[#1769AA] underline"
            >
              booking terms
            </Link>
            .
          </span>
        </label>
        {termsError && (
          <p role="alert" className="mt-2 text-sm text-red-700">
            Accept the house rules, cancellation policy, and booking terms to
            continue.
          </p>
        )}
      </section>

      {formError && (
        <p role="alert" className="mb-3 text-sm text-red-700">
          {formError}
        </p>
      )}
      <button
        type="button"
        onClick={() => void pay()}
        disabled={isPaying || !userId}
        className="inline-flex min-h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-4xl bg-[#d61a6b] px-4 py-3 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPaying && (
          <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
        )}
        {isPaying
          ? "Processing payment…"
          : userId
            ? `Pay ${formatMoney(price.total)}`
            : "Sign in or create an account to pay"}
      </button>
      <p
        role="status"
        aria-live="polite"
        className="mt-3 text-center text-xs leading-5 text-[#3A3856]/75"
      >
        {isPaying
          ? "Approve the M-Pesa prompt on your phone. Keep this page open while we confirm your booking."
          : "We’ll send an M-Pesa prompt to your phone when you continue."}
      </p>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[#006400]">
        <LockKeyhole size={13} aria-hidden="true" />
        Secured by Safaricom M-Pesa
      </p>

      {signinOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="signin-title"
            className="w-full max-w-md rounded-t-xl bg-white p-6 shadow-xl sm:rounded-xl"
          >
            <h2
              id="signin-title"
              className="text-lg font-semibold text-[#1B1A2E]"
            >
              Sign in to Dominium
            </h2>
            <p className="mt-1 text-sm text-[#3A3856]">
              Your trip details will stay on this page.
            </p>
            <div className="mt-5 space-y-4">
              <button
                type="button"
                onClick={() => void signInWithGoogleOnCheckout()}
                disabled={signinLoading || signinGoogleLoading}
                className="group relative flex w-full items-center justify-center gap-3 rounded-md border border-[#cfd3c9] bg-white px-4 py-3 text-[15px] text-[#12231d] transition-all duration-150 ease-out hover:border-[#ec1561]/50 hover:-translate-y-[1px] hover:shadow-[0_6px_16px_rgba(236,21,97,0.12)] active:translate-y-0 active:scale-[0.99] disabled:cursor-default disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                {signinGoogleLoading ? (
                  <span
                    className="flex items-center gap-1.5"
                    aria-live="polite"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#12231d] animate-dot-pulse motion-reduce:animate-none" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#12231d] animate-dot-pulse motion-reduce:animate-none [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#12231d] animate-dot-pulse motion-reduce:animate-none [animation-delay:300ms]" />
                    <span className="ml-2">Redirecting…</span>
                  </span>
                ) : (
                  <>
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      aria-hidden="true"
                    >
                      <path
                        fill="#4285F4"
                        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"
                      />
                      <path
                        fill="#34A853"
                        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33z"
                      />
                      <path
                        fill="#EA4335"
                        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58z"
                      />
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#dfe5df]" />
                </div>
                <div className="relative flex justify-center text-[11px] uppercase tracking-[0.2em] text-[#6b706a]">
                  <span className="bg-white px-2">or with email</span>
                </div>
              </div>

              <form
                onSubmit={(event) => void signInOnCheckout(event)}
                className="space-y-4"
              >
                <label className="block text-sm font-medium text-[#3A3856]">
                  Email
                  <input
                    type="email"
                    required
                    value={signinEmail}
                    onChange={(event) => setSigninEmail(event.target.value)}
                    autoComplete="email"
                    className="mt-1 block min-h-12 w-full rounded-md border border-[#DDE0E4] bg-white px-3 text-base shadow-[0_1px_3px_rgba(31,41,55,0.05)] transition-shadow focus:border-[#9BB9D2] focus:outline-none focus:ring-2 focus:ring-[#1769AA]/15"
                  />
                </label>
                <label className="block text-sm font-medium text-[#3A3856]">
                  Password
                  <input
                    type="password"
                    required
                    value={signinPassword}
                    onChange={(event) => setSigninPassword(event.target.value)}
                    autoComplete="current-password"
                    className="mt-1 block min-h-12 w-full rounded-md border border-[#DDE0E4] bg-white px-3 text-base shadow-[0_1px_3px_rgba(31,41,55,0.05)] transition-shadow focus:border-[#9BB9D2] focus:outline-none focus:ring-2 focus:ring-[#1769AA]/15"
                  />
                </label>
                {signinError && (
                  <p role="alert" className="text-sm text-red-700">
                    {signinError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={signinLoading || signinGoogleLoading}
                  className="min-h-12 w-full rounded-md bg-[#1B1A2E] px-4 font-semibold text-white disabled:cursor-default disabled:opacity-60"
                >
                  {signinLoading ? "Signing in…" : "Sign in"}
                </button>
              </form>

              <p className="text-center text-sm text-[#3A3856]">
                New to Dominium?{" "}
                <Link
                  href={signupUrl}
                  className="font-semibold text-[#1769AA] underline underline-offset-2"
                >
                  Create an account
                </Link>
              </p>
              <button
                type="button"
                onClick={() => setSigninOpen(false)}
                className="min-h-12 w-full rounded-md border border-[#B8B7B2] px-4 font-medium text-[#1B1A2E]"
              >
                Back to checkout
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
