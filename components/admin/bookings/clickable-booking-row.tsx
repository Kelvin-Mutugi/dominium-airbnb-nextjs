"use client";

export function ClickableBookingRow({
  bookingId,
  children,
}: {
  bookingId: string;
  children: React.ReactNode;
}) {
  const openDetails = () => {
    window.open(`/admin/bookings/${bookingId}`, "_blank", "noopener,noreferrer");
  };

  const handleClick = (event: React.MouseEvent<HTMLTableRowElement>) => {
    if ((event.target as HTMLElement).closest("button, a")) return;
    openDetails();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openDetails();
  };

  return (
    <tr
      tabIndex={0}
      role="link"
      aria-label="Open booking details"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="cursor-pointer hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E23E85]"
    >
      {children}
    </tr>
  );
}