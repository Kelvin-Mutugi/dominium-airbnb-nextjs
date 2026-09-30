"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import BookingCheckout from "@/components/booking/BookingCheckout";

export default function BookingPage() {
	const { id } = useParams();
	const searchParams = useSearchParams();
	const listingId = Array.isArray(id) ? id[0] : id;
	const checkIn = searchParams.get("checkIn") ?? "";
	const checkOut = searchParams.get("checkOut") ?? "";
	const resumeBookingId = searchParams.get("bookingId") ?? undefined;
	const requestedGuests = Number(searchParams.get("guests") ?? 1);
	const guests = Number.isInteger(requestedGuests) && requestedGuests > 0 ? requestedGuests : 1;
	const kids = Math.max(0, Math.min(guests - 1, Number(searchParams.get("children") ?? 0) || 0));
	const pets = Math.max(0, Math.min(10, Number(searchParams.get("pets") ?? 0) || 0));
	const listingUrl = `/apartments/${listingId}?${new URLSearchParams({ checkIn, checkOut, guests: String(guests), children: String(kids), pets: String(pets), ...(resumeBookingId ? { bookingId: resumeBookingId } : {}) }).toString()}`;

	return (
		<main className="min-h-screen bg-white text-[#1B1A2E]">
			<header className="mx-auto flex w-full max-w-xl items-center gap-4 border-b border-[#E9E6DD] px-4 py-4 sm:px-6">
				<Link href={listingUrl} aria-label="Back to listing" className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-[#F4F3F0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1769AA]">
					<ArrowLeft size={21} aria-hidden="true" />
				</Link>
				<h1 className="text-lg font-semibold">Confirm and pay</h1>
			</header>
			<BookingCheckout
				listingId={listingId}
				checkIn={checkIn}
				checkOut={checkOut}
				guests={guests}
				kids={kids}
				pets={pets}
				resumeBookingId={resumeBookingId}
			/>
		</main>
	);
}

