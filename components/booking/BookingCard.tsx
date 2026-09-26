"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";

import { supabase } from "@/app/lib/supabase/client";

interface BookingListing {
  id: string;

  title: string;

  price_per_night: number | string;

  max_guests: number;

  host_id: string;

  cancellation_policy: string | null;

  booking_terms: string | null;

  house_rules: string[] | null;

  service_fee_percent: number | string | null;

  min_nights: number | null;
}

interface BookingCardProps {
  listingId: string;

  initialCheckIn?: string;

  initialCheckOut?: string;
}

type Step = 1 | 2 | 3 | 4;

type FieldErrors = Partial<
  Record<
    | "fullName"
    | "phone"
    | "email"
    | "dates"
    | "adults"
    | "children"
    | "rooms"
    | "terms",
    string
  >
>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PHONE_RE = /^[+\d][\d\s-]{6,}$/;

// Dates as plain YYYY-MM-DD, compared as UTC calendar days so local timezone

// never shifts a check-in/check-out by a day.

function toUTCDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [y, m, d] = value.split("-").map(Number);

  const date = new Date(Date.UTC(y, m - 1, d));

  return Number.isNaN(date.getTime()) ? null : date;
}

function todayUTCString(): string {
  const now = new Date();

  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))

    .toISOString()

    .slice(0, 10);
}

function formatDate(value: string): string {
  const date = toUTCDate(value);

  if (!date) return "Not selected";

  return date.toLocaleDateString("en-KE", {
    day: "numeric",

    month: "short",

    year: "numeric",

    timeZone: "UTC",
  });
}

function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount)) return "KES 0";

  return new Intl.NumberFormat("en-KE", {
    style: "currency",

    currency: "KES",

    maximumFractionDigits: 0,
  }).format(amount);
}

export default function BookingCard({
  listingId,

  initialCheckIn = "",

  initialCheckOut = "",
}: BookingCardProps) {
  const [listing, setListing] = useState<BookingListing | null>(null);

  const [bookedDateRanges, setBookedDateRanges] = useState<Array<{ start: string; end: string }>>([]);

  const [availabilityLoaded, setAvailabilityLoaded] = useState(false);

  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [loadError, setLoadError] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null | undefined>(undefined); // undefined = unknown yet

  const [checkIn, setCheckIn] = useState(initialCheckIn);

  const [checkOut, setCheckOut] = useState(initialCheckOut);

  const [adults, setAdults] = useState(1);

  const [children, setChildren] = useState(0);

  const [rooms, setRooms] = useState(1);

  const [fullName, setFullName] = useState("");

  const [phone, setPhone] = useState("");

  const [email, setEmail] = useState("");

  const [country, setCountry] = useState("");

  const [specialRequests, setSpecialRequests] = useState("");

  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<"mpesa" | "card">("mpesa");

  const [step, setStep] = useState<Step>(1);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [formError, setFormError] = useState<string | null>(null);

  const [isBooking, setIsBooking] = useState(false);

  // Synchronous guard against double-submit (state updates are async, so a

  // fast double-click can fire the handler twice before `isBooking` re-renders).

  const submitLockRef = useRef(false);

  // One idempotency key per checkout attempt so a retried request after a

  // network hiccup doesn't create a duplicate booking (requires the insert

  // path / RPC to dedupe on this column — see note in handleBooking).

  const idempotencyKeyRef = useRef<string>("");

  const minCheckIn = todayUTCString();

  const minCheckOut = useMemo(() => {
    const base = toUTCDate(checkIn) ?? toUTCDate(minCheckIn)!;

    const next = new Date(base);

    next.setUTCDate(next.getUTCDate() + 1);

    return next.toISOString().slice(0, 10);
  }, [checkIn, minCheckIn]);

  // --- Load listing -------------------------------------------------------

  const loadListing = useCallback(async () => {
    setIsLoading(true);

    setLoadError(null);

    setAvailabilityLoaded(false);

    setAvailabilityError(null);

    try {
      const { data, error } = await supabase

        .from("listings")

        .select(
          "id, title, price_per_night, max_guests, host_id, cancellation_policy, booking_terms, house_rules, service_fee_percent, min_nights",
        )

        .eq("id", listingId)

        .eq("status", "published")

        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setLoadError("This listing is no longer available.");

        setListing(null);

        return;
      }

      setListing(data);

      try {
        const response = await fetch(`/api/listings/${encodeURIComponent(listingId)}/availability`, { cache: "no-store" });
        if (!response.ok) throw new Error("Availability is temporarily unavailable. Please try again later.");
        const payload = (await response.json()) as { ranges?: Array<{ start: string; end: string }> };
        if (!Array.isArray(payload.ranges) || payload.ranges.some((range) => typeof range.start !== "string" || typeof range.end !== "string")) {
          throw new Error("Availability could not be verified. Please try again later.");
        }
        setBookedDateRanges(payload.ranges);
        setAvailabilityLoaded(true);
      } catch (availabilityLoadError) {
        setAvailabilityError(
          availabilityLoadError instanceof Error
            ? availabilityLoadError.message
            : "Availability is temporarily unavailable. Please try again later.",
        );
        setAvailabilityLoaded(true);
      }
    } catch {
      setLoadError(
        "Unable to load this listing. Please check your connection and try again.",
      );

      setListing(null);
    } finally {
      setIsLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `checkout-${listingId}`;
    }
  }, [listingId]);

  useEffect(() => {
    // The loader owns its state transitions and is intentionally started on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadListing();
  }, [loadListing]);

  // --- Auth ----------------------------------------------------------------

  // Checked as soon as the card mounts (not only at final submit) so we can

  // steer an unauthenticated guest to sign in before they fill in the whole

  // form, and kept in sync in case they sign in/out in another tab.

  useEffect(() => {
    let ignore = false;

    supabase.auth.getUser().then(async ({ data }) => {
      if (ignore) return;

      const user = data.user;

      setUserId(user?.id ?? null);

      if (!user) return;

      setEmail((current) => current || user.email || "");

      const { data: profile } = await supabase

        .from("profiles")

        .select("full_name, phone")

        .eq("id", user.id)

        .maybeSingle();

      if (ignore) return;

      setFullName((current) => current || profile?.full_name || "");

      setPhone((current) => current || profile?.phone || "");
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!ignore) setUserId(session?.user?.id ?? null);
      },
    );

    return () => {
      ignore = true;

      subscription.subscription.unsubscribe();
    };
  }, []);

  // --- Derived pricing -------------------------------------------------------

  // NOTE: these figures are for display only. The server (RPC / API route)

  // must recompute price, service fee, and total from the listing record

  // before writing a booking or payment row — never trust client-submitted

  // amounts for money. See handleBooking().

  const nights = useMemo(() => {
    const inDate = toUTCDate(checkIn);

    const outDate = toUTCDate(checkOut);

    if (!inDate || !outDate) return 0;

    const diff = Math.round(
      (outDate.getTime() - inDate.getTime()) / 86_400_000,
    );

    return diff > 0 ? diff : 0;
  }, [checkIn, checkOut]);

  const nightlyPrice = useMemo(() => {
    const parsed = Number(listing?.price_per_night ?? 0);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [listing]);

  const totalPrice = nightlyPrice * nights;

  const serviceFeeRate = Number(listing?.service_fee_percent ?? 0);

  const serviceFee = Math.round(
    totalPrice * (Number.isFinite(serviceFeeRate) ? serviceFeeRate : 0),
  );

  const grandTotal = totalPrice + serviceFee;

  const totalGuests = adults + children;

  // --- Validation -----------------------------------------------------------

  const validateGuestDetails = (): FieldErrors => {
    const errors: FieldErrors = {};

    if (!fullName.trim()) errors.fullName = "Enter your full name.";

    if (!PHONE_RE.test(phone.trim()))
      errors.phone = "Enter a valid phone number.";

    if (!EMAIL_RE.test(email.trim()))
      errors.email = "Enter a valid email address.";

    return errors;
  };

  const validateStay = (): FieldErrors => {
    const errors: FieldErrors = {};

    const inDate = toUTCDate(checkIn);

    const outDate = toUTCDate(checkOut);

    const today = toUTCDate(minCheckIn)!;

    if (!inDate || !outDate) {
      errors.dates = "Please select check-in and check-out dates.";
    } else if (inDate.getTime() < today.getTime()) {
      errors.dates = "Check-in can't be in the past.";
    } else if (outDate.getTime() <= inDate.getTime()) {
      errors.dates = "Check-out must be after check-in.";
    } else if (!availabilityLoaded) {
      errors.dates = "Checking date availability. Please try again in a moment.";
    } else if (availabilityError) {
      errors.dates = availabilityError;
    } else if (bookedDateRanges.some((range) => range.start < checkOut && range.end > checkIn)) {
      errors.dates = "Those dates include nights that are already unavailable. Choose different dates.";
    }

    if (!listing) {
      errors.adults = "Listing details are still loading.";
    } else if (!Number.isInteger(adults) || adults < 1) {
      errors.adults = "At least 1 adult is required.";
    } else if (!Number.isInteger(children) || children < 0) {
      errors.children = "Children cannot be negative.";
    } else if (totalGuests > listing.max_guests) {
      errors.adults = `This listing accommodates up to ${listing.max_guests} guest${listing.max_guests === 1 ? "" : "s"}.`;
    }

    if (!Number.isInteger(rooms) || rooms < 1)
      errors.rooms = "At least 1 room or unit is required.";

    if (listing?.min_nights && nights > 0 && nights < listing.min_nights) {
      errors.dates = `This listing requires a minimum stay of ${listing.min_nights} night${listing.min_nights === 1 ? "" : "s"}.`;
    }

    return errors;
  };

  const handleAdultsChange = (raw: string) => {
    if (raw === "") {
      setAdults(1);

      return;
    }

    const parsed = Math.trunc(Number(raw));

    if (Number.isNaN(parsed)) return;

    const max = listing?.max_guests ?? parsed;

    setAdults(Math.min(Math.max(parsed, 1), Math.max(max, 1)));
  };

  const goToStep = (target: Step) => {
    setFormError(null);

    setStep(target);
  };

  const continueToReview = () => {
    const guestErrors = validateGuestDetails();

    const stayErrors = validateStay();

    const errors = { ...guestErrors, ...stayErrors };

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setFormError("Please fix the highlighted fields.");

      return;
    }

    setFormError(null);

    goToStep(2);
  };

  const continueToPayment = () => {
    const errors = validateStay();

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setFormError("Please fix the highlighted fields.");

      return;
    }

    setFormError(null);

    goToStep(3);
  };

  // --- Submit -----------------------------------------------------------

  const handleBooking = async () => {
    if (submitLockRef.current) return;

    const errors = { ...validateGuestDetails(), ...validateStay() };
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0 || !listing) {
      setFormError("Please fix the highlighted fields before paying.");
      return;
    }

    if (!agreedToTerms) {
      setFieldErrors((current) => ({
        ...current,
        terms: "You must agree to the booking terms and cancellation policy.",
      }));
      setFormError("Please accept the booking terms before paying.");
      return;
    }

    submitLockRef.current = true;
    setIsBooking(true);
    setFormError(null);

    try {
      // The server creates the booking and calculates the amount from the
      // database. The client-side total is display-only.
      const bookingResponse = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          checkIn,
          checkOut,
          guests: totalGuests,
          children,
          rooms,
          specialRequests,
          fullName,
          phone,
          email,
          agreedToTerms,
          paymentMethod,
          idempotencyKey: idempotencyKeyRef.current,
        }),
      });

      const bookingResult = await bookingResponse.json();

      if (!bookingResponse.ok) {
        console.error("Booking request failed", bookingResult);
        setFormError(
          bookingResult.error
            ? `${bookingResult.error}${bookingResult.code ? ` (${bookingResult.code})` : ""}`
            : "We couldn't create your booking. Please try again.",
        );
        return;
      }

      if (!bookingResult.bookingId) {
        console.error(
          "Booking response did not include bookingId",
          bookingResult,
        );
        setFormError(
          "The booking was created, but no booking ID was returned.",
        );
        return;
      }

      const serverTotal = Number(bookingResult.totalAmount);

      if (!Number.isFinite(serverTotal) || serverTotal <= 0) {
        console.error(
          "Invalid booking total returned by server",
          bookingResult,
        );
        setFormError("The booking amount returned by the server is invalid.");
        return;
      }

      // Create the Paystack checkout session on the server. The secret key
      // never reaches the browser.
      const paymentResponse = await fetch("/api/payments/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: bookingResult.bookingId,
          paymentMethod,
        }),
      });

      const paymentResult = await paymentResponse.json();

      if (!paymentResponse.ok || !paymentResult.authorization_url) {
        console.error("Paystack initialization failed", paymentResult);
        setFormError(
          paymentResult.error ||
            "Your booking was created, but we couldn't open the payment page. Please try again.",
        );
        return;
      }

      // Paystack redirects the guest to the hosted checkout. Payment status
      // is finalized by the server-side webhook/verification flow, not here.
      window.location.href = paymentResult.authorization_url;
    } catch (error) {
      console.error("Booking/payment error:", error);
      setFormError(
        "We couldn't reach the payment server. Please check your connection and try again.",
      );
    } finally {
      setIsBooking(false);
      submitLockRef.current = false;
    }
  };

  // --- Render -----------------------------------------------------------

  if (isLoading) {
    return (
      <div className="w-full max-w-[400px] rounded-lg border border-gray-300 p-4 shadow-sm">
        <div
          className="animate-pulse space-y-4"
          aria-busy="true"
          aria-label="Loading listing"
        >
          <div className="h-6 w-40 rounded bg-gray-200" />

          <div className="h-10 rounded bg-gray-200" />

          <div className="h-10 rounded bg-gray-200" />

          <div className="h-10 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="w-full max-w-[400px] rounded-lg border border-red-200 p-4 text-sm text-red-600 shadow-sm">
        <p role="alert">
          {loadError ?? "This listing is no longer available."}
        </p>

        <button
          type="button"
          onClick={() => void loadListing()}
          className="mt-3 rounded-md border border-red-300 px-3 py-1.5 text-red-700 hover:bg-red-50"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[560px] rounded-lg border border-gray-300 bg-white p-6 shadow-sm">
      <div className="mb-6 grid grid-cols-4 gap-2">
        {(["Your details", "Review", "Payment", "Confirmed"] as const).map(
          (label, index) => {
            const stepNumber = (index + 1) as Step;

            return (
              <button
                key={label}
                type="button"
                disabled={stepNumber > step || stepNumber === 4}
                onClick={() => goToStep(stepNumber)}
                aria-current={step === stepNumber ? "step" : undefined}
                className={`border-t-4 px-1 pt-2 text-left text-[11px] font-semibold transition-colors disabled:cursor-not-allowed ${
                  step === stepNumber
                    ? "border-[#E23E85] text-[#1B1A2E]"
                    : stepNumber < step
                      ? "border-[#128C7E] text-[#128C7E] hover:text-[#0D665D]"
                      : "border-[#E9E6DD] text-gray-400"
                }`}
              >
                {stepNumber}. {label}
              </button>
            );
          },
        )}
      </div>

      {step === 1 && (
        <section>
          <h2 className="text-xl font-semibold text-[#1B1A2E]">
            1. Your details
          </h2>

          <div className="mt-4 rounded-md border border-[#E9E6DD] bg-[#F8F7F4] p-4 text-sm text-[#3A3856]">
            <p className="font-semibold text-[#1B1A2E]">Your stay</p>

            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <label htmlFor="check-in" className="font-medium">
                Check-in
                <input
                  id="check-in"
                  type="date"
                  min={minCheckIn}
                  value={checkIn}
                  onChange={(event) => setCheckIn(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.dates)}
                  className="mt-1 block w-full rounded border border-gray-300 bg-white p-2 font-normal text-[#1B1A2E]"
                />
              </label>

              <label htmlFor="check-out" className="font-medium">
                Check-out
                <input
                  id="check-out"
                  type="date"
                  min={minCheckOut}
                  value={checkOut}
                  onChange={(event) => setCheckOut(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.dates)}
                  className="mt-1 block w-full rounded border border-gray-300 bg-white p-2 font-normal text-[#1B1A2E]"
                />
              </label>

              <label htmlFor="adults" className="font-medium">
                Adults
                <input
                  id="adults"
                  type="number"
                  min={1}
                  max={listing.max_guests}
                  value={adults}
                  onChange={(event) => handleAdultsChange(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.adults)}
                  className="mt-1 block w-full rounded border border-gray-300 bg-white p-2 font-normal text-[#1B1A2E]"
                />
              </label>

              <label htmlFor="children" className="font-medium">
                Children{" "}
                <span className="font-normal text-[#3A3856]/60">
                  (optional)
                </span>
                <input
                  id="children"
                  type="number"
                  min={0}
                  value={children}
                  onChange={(event) =>
                    setChildren(
                      Math.max(0, Math.trunc(Number(event.target.value) || 0)),
                    )
                  }
                  aria-invalid={Boolean(fieldErrors.children)}
                  className="mt-1 block w-full rounded border border-gray-300 bg-white p-2 font-normal text-[#1B1A2E]"
                />
              </label>

              <label htmlFor="rooms" className="font-medium">
                Rooms / units
                <input
                  id="rooms"
                  type="number"
                  min={1}
                  value={rooms}
                  onChange={(event) =>
                    setRooms(
                      Math.max(1, Math.trunc(Number(event.target.value) || 1)),
                    )
                  }
                  aria-invalid={Boolean(fieldErrors.rooms)}
                  className="mt-1 block w-full rounded border border-gray-300 bg-white p-2 font-normal text-[#1B1A2E]"
                />
              </label>
            </div>

            {availabilityError && (
              <p role="alert" className="mt-2 text-xs text-red-700">
                {availabilityError} Booking is disabled until dates can be verified.
              </p>
            )}

            {(fieldErrors.dates ||
              fieldErrors.adults ||
              fieldErrors.children ||
              fieldErrors.rooms) && (
              <p className="mt-2 text-xs text-red-600" role="alert">
                {fieldErrors.dates ??
                  fieldErrors.adults ??
                  fieldErrors.children ??
                  fieldErrors.rooms}
              </p>
            )}

            <p className="mt-3 text-xs text-[#3A3856]/70">
              {formatDate(checkIn)} to {formatDate(checkOut)}
              {nights > 0
                ? ` · ${nights} night${nights === 1 ? "" : "s"}`
                : ""}{" "}
              · {totalGuests} guest
              {totalGuests === 1 ? "" : "s"}
            </p>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label
              htmlFor="full-name"
              className="text-sm font-medium text-gray-700"
            >
              Name
              <input
                id="full-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                aria-invalid={Boolean(fieldErrors.fullName)}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2"
              />
              {fieldErrors.fullName && (
                <span className="mt-1 block text-xs text-red-600">
                  {fieldErrors.fullName}
                </span>
              )}
            </label>

            <label
              htmlFor="phone"
              className="text-sm font-medium text-gray-700"
            >
              Phone
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                aria-invalid={Boolean(fieldErrors.phone)}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2"
              />
              {fieldErrors.phone && (
                <span className="mt-1 block text-xs text-red-600">
                  {fieldErrors.phone}
                </span>
              )}
            </label>

            <label
              htmlFor="email"
              className="text-sm font-medium text-gray-700"
            >
              Email
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(fieldErrors.email)}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2"
              />
              {fieldErrors.email && (
                <span className="mt-1 block text-xs text-red-600">
                  {fieldErrors.email}
                </span>
              )}
            </label>

            <label
              htmlFor="country"
              className="text-sm font-medium text-gray-700"
            >
              Country{" "}
              <span className="font-normal text-gray-500">(optional)</span>
              <input
                id="country"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2"
              />
            </label>
          </div>

          <label
            htmlFor="special-requests"
            className="mt-4 block text-sm font-medium text-gray-700"
          >
            Special requests{" "}
            <span className="font-normal text-gray-500">(optional)</span>
            <textarea
              id="special-requests"
              value={specialRequests}
              onChange={(event) => setSpecialRequests(event.target.value)}
              rows={3}
              placeholder="Anything your host should know?"
              className="mt-1 block w-full rounded-md border border-gray-300 p-2"
            />
          </label>

          {userId === null && (
            <p className="mt-4 text-xs text-[#3A3856]">
              Already have an account?{" "}
              <Link
                href={`/signin?redirectTo=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/")}`}
                className="font-semibold text-[#E23E85] hover:underline"
              >
                Sign in
              </Link>
            </p>
          )}

          <button
            type="button"
            onClick={continueToReview}
            className="mt-6 w-full rounded-md bg-[#1B1A2E] px-4 py-3 text-white"
          >
            Continue
          </button>
        </section>
      )}

      {step === 2 && (
        <section>
          <h2 className="text-xl font-semibold text-[#1B1A2E]">2. Review</h2>

          <div className="mt-4 space-y-3 rounded-md bg-gray-50 p-4 text-sm text-[#3A3856]">
            <p>
              <span className="font-medium">Property:</span> {listing.title}
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              <label htmlFor="check-in-2" className="font-medium">
                Check-in
                <input
                  id="check-in-2"
                  type="date"
                  min={minCheckIn}
                  value={checkIn}
                  onChange={(event) => setCheckIn(event.target.value)}
                  className="mt-1 block w-full rounded border border-gray-300 p-2 font-normal"
                />
              </label>

              <label htmlFor="check-out-2" className="font-medium">
                Check-out
                <input
                  id="check-out-2"
                  type="date"
                  min={minCheckOut}
                  value={checkOut}
                  onChange={(event) => setCheckOut(event.target.value)}
                  className="mt-1 block w-full rounded border border-gray-300 p-2 font-normal"
                />
              </label>

              <label htmlFor="adults-2" className="font-medium">
                Adults
                <input
                  id="adults-2"
                  type="number"
                  min={1}
                  max={listing.max_guests}
                  value={adults}
                  onChange={(event) => handleAdultsChange(event.target.value)}
                  className="mt-1 block w-full rounded border border-gray-300 p-2 font-normal"
                />
              </label>

              <div className="font-medium">
                Guests{" "}
                <p className="mt-1 font-normal">
                  {adults} adults, {children} children
                </p>
              </div>

              <div className="font-medium">
                Rooms / units <p className="mt-1 font-normal">{rooms}</p>
              </div>
            </div>

            <p>
              <span className="font-medium">Guest details:</span> {fullName},{" "}
              {email}, {country}
            </p>

            <p>
              <span className="font-medium">Nights:</span> {nights}
            </p>

            <p>
              <span className="font-medium">Subtotal:</span>{" "}
              {formatCurrency(totalPrice)}
            </p>

            <p>
              <span className="font-medium">Service fee:</span>{" "}
              {formatCurrency(serviceFee)}
            </p>

            <p className="text-base font-semibold text-[#1B1A2E]">
              Total: {formatCurrency(grandTotal)}
            </p>

            <p>
              <span className="font-medium">Cancellation:</span>{" "}
              <Link
                href="/refund-cancellation-policy"
                className="text-[#E23E85] underline hover:text-[#c52f70]"
              >
                Refund & cancellation policy
              </Link>
            </p>

            {listing.booking_terms && (
              <p>
                <span className="font-medium">Booking terms:</span>{" "}
                {listing.booking_terms}
              </p>
            )}

            {listing.house_rules?.length ? (
              <p>
                <span className="font-medium">House rules:</span>{" "}
                {listing.house_rules.join("; ")}
              </p>
            ) : null}

            <label className="flex items-start gap-2 border-t border-gray-200 pt-3 text-sm text-[#3A3856]">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(event) => setAgreedToTerms(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#1B1A2E]"
                aria-invalid={Boolean(fieldErrors.terms)}
              />

              <span>
                I agree to the property&apos;s House rules and platform&apos;s Refund & Cancellation Policy, Booking terms, Terms & Conditions and [Privacy Policy].
                By checking this box, I consent to dominium bnb collecting and
                storing my name, email address, and phone number to process my 
                booking, manage my stay, and send transactional updates via email, 
                SMS, or WhatsApp.
                {fieldErrors.terms && (
                  <span className="mt-1 block text-xs text-red-600">
                    {fieldErrors.terms}
                  </span>
                )}
              </span>
            </label>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => goToStep(1)}
              className="w-full rounded-md border border-gray-300 px-4 py-3 text-[#36454F]"
            >
              Back to details
            </button>

            <button
              type="button"
              onClick={continueToPayment}
              className="w-full rounded-md bg-[#1B1A2E] px-4 py-3 text-white"
            >
              Continue to payment
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section>
          <h2 className="text-xl font-semibold text-[#1B1A2E]">3. Payment</h2>

          <div className="mt-4 space-y-3">
            {(["mpesa", "card"] as const).map((method) => (
              <label
                key={method}
                className="flex cursor-pointer items-center gap-3 rounded-md border border-gray-300 p-4"
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === method}
                  onChange={() => setPaymentMethod(method)}
                />

                <span className="capitalize text-[#3A3856]">
                  {method === "mpesa" ? "M-Pesa" : "Card"}
                </span>
              </label>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => goToStep(2)}
              disabled={isBooking}
              className="w-full rounded-md border border-gray-300 px-4 py-3 text-[#36454F] disabled:opacity-50"
            >
              Back to review
            </button>

            <button
              type="button"
              onClick={() => void handleBooking()}
              disabled={isBooking || grandTotal <= 0}
              className="w-full rounded-md bg-[#1B1A2E] px-4 py-3 text-white disabled:opacity-50"
            >
              {isBooking
                ? "Opening secure payment..."
                : `Confirm & Pay ${formatCurrency(grandTotal)}`}
            </button>
          </div>
        </section>
      )}

      {formError && (
        <p
          className="mt-4 text-sm text-red-600"
          role="alert"
          aria-live="polite"
        >
          {formError}
        </p>
      )}
    </div>
  );
}
