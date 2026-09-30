import "server-only";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

export async function sendBookingConfirmationEmail(input: {
  bookingId: string;
  bookingReference: string;
  recipient: string;
  listingTitle: string;
  checkIn: string;
  checkOut: string;
  totalPaid: number;
  hostContact: string | null;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BOOKING_CONFIRMATION_FROM;
  if (!apiKey || !from) {
    console.warn("Booking email skipped: configure RESEND_API_KEY and BOOKING_CONFIRMATION_FROM.");
    return false;
  }

  const title = escapeHtml(input.listingTitle);
  const reference = escapeHtml(input.bookingReference || input.bookingId);
  const dates = `${escapeHtml(input.checkIn)} to ${escapeHtml(input.checkOut)}`;
  const amount = new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(input.totalPaid);
  const hostContact = input.hostContact
    ? `<p><strong>Host contact:</strong><br>${escapeHtml(input.hostContact).replaceAll("\n", "<br>")}</p>`
    : "";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `booking-confirmation-${input.bookingId}`,
    },
    body: JSON.stringify({
      from,
      to: [input.recipient],
      subject: `Booking confirmed: ${input.listingTitle}`,
      text: [
        "Your Dominium booking is confirmed.",
        `Booking ID: ${input.bookingReference || input.bookingId}`,
        `Stay: ${input.checkIn} to ${input.checkOut}`,
        `Total paid: ${amount}`,
        input.hostContact ? `Host contact: ${input.hostContact}` : "Host contact is available in your arrival guide.",
      ].join("\n"),
      html: `<h1>Your booking is confirmed</h1><p><strong>${title}</strong></p><p>Booking ID: ${reference}</p><p>Stay: ${dates}</p><p>Total paid: ${escapeHtml(amount)}</p>${hostContact}`,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Booking confirmation email failed (${response.status}): ${detail.slice(0, 300)}`);
  }
  return true;
}