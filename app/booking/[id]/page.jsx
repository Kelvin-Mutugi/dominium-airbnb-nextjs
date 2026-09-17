"use client";

import { useParams, useSearchParams } from "next/navigation";
import Navbar from "@/components/navigationBar";
import BookingCard from "@/components/booking/bookingCard";

export default function BookingPage() {
	const { id } = useParams();
	const searchParams = useSearchParams();
	const listingId = Array.isArray(id) ? id[0] : id;
	const checkIn = searchParams.get("checkIn") ?? "";
	const checkOut = searchParams.get("checkOut") ?? "";

	return (
		<>
			<Navbar />
			<main className="min-h-screen bg-[#F8F7F4] px-6 py-12">
				<div className="mx-auto max-w-5xl">
					<h1 className="text-3xl font-semibold text-[#1B1A2E]">Complete your booking</h1>
					<p className="mt-2 text-[#3A3856]">
						Review your dates and guest count before confirming your stay.
					</p>
					<div className="mt-8">
						<BookingCard
							listingId={listingId}
							initialCheckIn={checkIn}
							initialCheckOut={checkOut}
						/>
					</div>
				</div>
			</main>
		</>
	);
}

