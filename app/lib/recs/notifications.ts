export interface NotificationPayload {
  channel: "email" | "whatsapp";
  recipient: string;
  message: string;
}

export async function sendNotification(
  notification: NotificationPayload,
): Promise<never> {
  void notification;
  throw new Error(
    "Notification delivery is not configured; messages must remain queued.",
  );
}

export function buildUnsubscribeUrl(
  token: string,
  applicationOrigin: string,
) {
  const url = new URL("/recs/unsubscribe", applicationOrigin);
  url.searchParams.set("token", token);
  return url.toString();
}

type AlertMessageInput = {
  listingTitle: string;
  unsubscribeUrl: string;
} & (
  | {
      alertType: "price_drop";
      previousPrice: number;
      currentPrice: number;
    }
  | {
      alertType: "availability";
      checkIn: string;
      checkOut: string;
    }
);

export function buildAlertMessage(input: AlertMessageInput) {
  const message =
    input.alertType === "price_drop"
      ? `${input.listingTitle} has a lower nightly price: KES ${input.currentPrice.toLocaleString("en-KE")} (previously KES ${input.previousPrice.toLocaleString("en-KE")}).`
      : `${input.listingTitle} is now available from ${input.checkIn} to ${input.checkOut}.`;
  return `${message} Unsubscribe from alerts: ${input.unsubscribeUrl}`;
}
