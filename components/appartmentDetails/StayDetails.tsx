// appartmentDetails/StayDetails.tsx
import { Users, LogIn, LogOut, CalendarClock, BedDouble, Bath } from "lucide-react";

interface StayDetailsProps {
  listing: {
    maxGuests: number;
    checkInTime: string;
    checkOutTime: string;
    minNights: number;
    bedrooms?: number;
    bathrooms?: number;
  };
}

export function StayDetails({ listing }: StayDetailsProps) {
  const items = [
    { icon: Users, label: `Up to ${listing.maxGuests} guests` },
    listing.bedrooms ? { icon: BedDouble, label: `${listing.bedrooms} bedroom${listing.bedrooms === 1 ? "" : "s"}` } : null,
    listing.bathrooms ? { icon: Bath, label: `${listing.bathrooms} bathroom${listing.bathrooms === 1 ? "" : "s"}` } : null,
    { icon: LogIn, label: `Check-in after ${listing.checkInTime}` },
    { icon: LogOut, label: `Check-out by ${listing.checkOutTime}` },
    {
      icon: CalendarClock,
      label: `${listing.minNights} night${listing.minNights > 1 ? "s" : ""} minimum`,
    },
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 border-y border-[#EDEBE4] py-4">
      {items.map(({ icon: Icon, label }) => (
        <div key={label} className="flex items-center gap-2 text-[14px] text-[#3A3856]">
          <Icon size={16} className="text-[#1B1A2E]" />
          {label}
        </div>
      ))}
    </div>
  );
}