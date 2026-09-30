import { NextRequest, NextResponse } from "next/server";
import { BookingRequestError, createBooking } from "@/app/lib/booking/create-booking";
import { createClient } from "@/app/lib/supabase/server";

interface BookingRequestBody {
  listingId?: unknown;
  checkIn?: unknown;
  checkOut?: unknown;
  guests?: unknown;
  children?: unknown;
  pets?: unknown;
  fullName?: unknown;
  email?: unknown;
  phone?: unknown;
  country?: unknown;
  specialRequests?: unknown;
  agreedToTerms?: unknown;
  paymentMethod?: unknown;
  idempotencyKey?: unknown;
  confirmationToken?: unknown;
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const requestOrigin = request.headers.get("origin");
  if (requestOrigin && new URL(requestOrigin).origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  let body: BookingRequestBody;
  try {
    body = (await request.json()) as BookingRequestBody;
  } catch {
    return badRequest("Invalid request body.");
  }

  if (
    typeof body.listingId !== "string" ||
    typeof body.checkIn !== "string" ||
    typeof body.checkOut !== "string" ||
    !Number.isInteger(body.guests) ||
    typeof body.fullName !== "string" ||
    typeof body.email !== "string" ||
    typeof body.phone !== "string" ||
    !Number.isInteger(body.children) ||
    !Number.isInteger(body.pets) ||
    typeof body.idempotencyKey !== "string" ||
    typeof body.confirmationToken !== "string" ||
    (body.paymentMethod !== "mpesa" && body.paymentMethod !== "card") ||
    body.agreedToTerms !== true
  ) {
    return badRequest("Complete the required booking details and accept the terms.");
  }

  if (body.country != null && typeof body.country !== "string") return badRequest("Invalid country value.");
  if (body.specialRequests != null && typeof body.specialRequests !== "string") return badRequest("Invalid special request value.");

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const booking = await createBooking({
      listingId: body.listingId,
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      guests: body.guests as number,
      children: body.children as number,
      pets: body.pets as number,
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      country: body.country as string | undefined,
      specialRequests: body.specialRequests as string | undefined,
      agreedToTerms: true,
      paymentMethod: body.paymentMethod,
      idempotencyKey: body.idempotencyKey,
      confirmationToken: body.confirmationToken,
      guestId: user?.id ?? null,
      accountEmail: user?.email ?? null,
    });

    const response = NextResponse.json(booking, { status: 201 });
    if (booking.isGuestBooking) {
      response.cookies.set(`booking-confirmation-${booking.bookingId}`, body.confirmationToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: `/api/bookings/${booking.bookingId}`,
        maxAge: 60 * 60 * 24 * 7,
      });
    }
    return response;
  } catch (error) {
    if (error instanceof BookingRequestError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    console.error("Booking request failed:", error);
    return NextResponse.json({ error: "We couldn't create this booking." }, { status: 500 });
  }
}