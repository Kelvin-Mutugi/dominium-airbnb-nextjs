"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

const CONSENT_COOKIE = "dominium_cookie_consent";
const CONSENT_VERSION = "v1";
const CONSENT_MAX_AGE = 60 * 60 * 24 * 180;

type ConsentChoice = "accepted" | "rejected";

function getConsentChoice(): ConsentChoice | null {
  const consent = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${CONSENT_COOKIE}=`))
    ?.split("=")[1];

  if (consent === `${CONSENT_VERSION}.accepted`) return "accepted";
  if (consent === `${CONSENT_VERSION}.rejected`) return "rejected";
  return null;
}

function subscribeToConsent() {
  return () => {};
}

function hasNoConsent() {
  return getConsentChoice() === null;
}

function getServerConsentSnapshot() {
  return false;
}

export default function CookieConsentBanner() {
  const [choiceMade, setChoiceMade] = useState(false);
  const consentNeeded = useSyncExternalStore(
    subscribeToConsent,
    hasNoConsent,
    getServerConsentSnapshot,
  );

  function chooseConsent(choice: ConsentChoice) {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${CONSENT_COOKIE}=${CONSENT_VERSION}.${choice}; Max-Age=${CONSENT_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
    setChoiceMade(true);
  }

  if (!consentNeeded || choiceMade) return null;

  return (
    <aside
      aria-label="Cookie preferences"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[#12231d]/15 bg-white/95 px-4 py-4 shadow-[0_-8px_30px_rgba(18,35,29,0.12)] sm:px-6"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-3xl">
          <h2 className="text-sm font-semibold text-[#12231d]">
            Your cookie choices
          </h2>
          <p className="mt-1 text-sm leading-5 text-[#565c57]">
            Essential cookies keep sign-in and bookings working. Choose whether
            to allow optional cookies for preferences, performance, and
            analytics. You can read more in our{" "}
            <Link
              href="/legal/guest-privacy-policy"
              className="font-medium text-[#9C2454] underline underline-offset-2"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => chooseConsent("rejected")}
            className="min-h-11 rounded-md border border-[#12231d]/25 px-4 py-2 text-sm font-semibold text-[#12231d] hover:bg-[#f3f5f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9C2454]"
          >
            Reject optional
          </button>
          <button
            type="button"
            onClick={() => chooseConsent("accepted")}
            className="min-h-11 rounded-md bg-[#12231d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#29463a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9C2454]"
          >
            Accept optional
          </button>
        </div>
      </div>
    </aside>
  );
}