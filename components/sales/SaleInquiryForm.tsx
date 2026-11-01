"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";

export function SaleInquiryForm({
  propertyId,
  propertyTitle,
  variant = "inline",
  askingPrice,
}: {
  propertyId: string;
  propertyTitle: string;
  variant?: "inline" | "mobile-sheet";
  askingPrice?: string;
}) {
  const instanceId = useId();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [sending, setSending] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cookieBannerOffset, setCookieBannerOffset] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const successDialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const successDoneRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (variant !== "mobile-sheet") return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (mobileOpen && !dialog.open) dialog.showModal();
    if (!mobileOpen && dialog.open) dialog.close();
  }, [mobileOpen, variant]);

  useEffect(() => {
    const dialog = successDialogRef.current;
    if (!dialog) return;
    if (success && !dialog.open) {
      dialog.showModal();
      successDoneRef.current?.focus();
    } else if (!success && dialog.open) {
      dialog.close();
    }
  }, [success]);

  useEffect(() => {
    if (variant !== "mobile-sheet") return;
    const updateCookieBannerOffset = () => {
      const banner = document.querySelector<HTMLElement>('[aria-label="Cookie preferences"]');
      const offset = banner?.getBoundingClientRect().height ?? 0;
      setCookieBannerOffset((current) => current === offset ? current : offset);
    };

    updateCookieBannerOffset();
    const observer = new MutationObserver(updateCookieBannerOffset);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", updateCookieBannerOffset);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateCookieBannerOffset);
    };
  }, [variant]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setError("");
    const form = event.currentTarget;
    const data = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/sale-inquiries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          propertyId,
          name: data.get("name"),
          email: data.get("email"),
          phone: data.get("phone"),
          message: data.get("message"),
          interestType: data.get("interest_type"),
          buyerFunding: data.get("buyer_funding"),
          timeline: data.get("timeline"),
          preferredContact: data.get("preferred_contact"),
          source: new URLSearchParams(window.location.search).get("source"),
          utmSource: new URLSearchParams(window.location.search).get("utm_source"),
          utmMedium: new URLSearchParams(window.location.search).get("utm_medium"),
          utmCampaign: new URLSearchParams(window.location.search).get("utm_campaign"),
          consent: data.get("consent") === "on",
          website: data.get("website"),
        }),
      });
      const result = await response.json() as { success?: boolean; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to send your inquiry.");
      form.reset();
      setSuccess(true);
      if (variant === "mobile-sheet") setMobileOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to send your inquiry.");
    } finally {
      setSending(false);
    }
  }

  const inputStyle =
    "mt-1 w-full rounded-lg border border-[#D9D5CF] bg-white px-3 py-2 text-base text-[#1B1A2E] outline-none focus:border-[#9C2454] focus:ring-2 focus:ring-[#9C2454]/15 sm:text-sm";

  if (variant === "mobile-sheet") {
    return (
      <>
        <div
          style={{ bottom: cookieBannerOffset }}
          className={`fixed inset-x-0 z-40 border-t border-[#E6E2DC] bg-white px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-8px_24px_rgba(27,26,46,0.12)] transition-[bottom] duration-200 lg:hidden ${mobileOpen ? "hidden" : ""}`}
        >
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-[#777582]">Asking price</p>
              <p className="truncate text-sm font-bold text-[#1B1A2E]">{askingPrice}</p>
            </div>
            <button
              ref={triggerRef}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
              className="min-h-12 shrink-0 rounded-xl bg-[#9C2454] px-6 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] hover:bg-[#7D1D43]"
            >
              Enquire now
            </button>
          </div>
        </div>

        <dialog
          ref={dialogRef}
          aria-labelledby="mobile-sale-inquiry-title"
          onClose={() => {
            setMobileOpen(false);
            triggerRef.current?.focus();
          }}
          onCancel={() => setMobileOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setMobileOpen(false);
            }
          }}
          onClick={(event) => {
            if (event.target === dialogRef.current) setMobileOpen(false);
          }}
          className={`fixed inset-x-0 top-auto bottom-0 m-0 max-h-[90dvh] w-full max-w-none flex-col gap-3 overflow-hidden rounded-t-2xl border-0 bg-[#FAF9F7] p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-[0_-12px_40px_rgba(27,26,46,0.2)] backdrop:bg-black/50 lg:hidden ${mobileOpen ? "flex" : "hidden"}`}
        >
          <header className="flex shrink-0 items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9C2454]">Property inquiry</p>
              <h2 id="mobile-sale-inquiry-title" className="truncate text-lg font-semibold text-[#1B1A2E]">
                Ask about this property
              </h2>
            </div>
            <button
              type="button"
              autoFocus
              onClick={() => setMobileOpen(false)}
              aria-label="Close inquiry form"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#D9D5CF] bg-white text-xl text-[#383746]"
            >
              ×
            </button>
          </header>
          <form
            onSubmit={submit}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-y-contain rounded-xl border border-[#E6E2DC] bg-white p-4 shadow-sm"
          >
            {renderInquiryFields({
              propertyTitle,
              inputStyle,
              error,
              sending,
              includeHeading: false,
            })}
          </form>
        </dialog>
        {renderSuccessDialog()}
      </>
    );
  }

  return (
    <>
      <form onSubmit={submit} className="max-h-[75vh] space-y-3 overflow-y-auto overscroll-y-contain rounded-xl border border-[#E6E2DC] bg-white p-4 shadow-sm">
        {renderInquiryFields({
          propertyTitle,
          inputStyle,
          error,
          sending,
          includeHeading: true,
        })}
      </form>
      {renderSuccessDialog()}
    </>
  );

  function renderSuccessDialog() {
    return (
      <dialog
        ref={successDialogRef}
        aria-labelledby={`${instanceId}-success-title`}
        aria-describedby={`${instanceId}-success-description`}
        onClose={() => setSuccess(false)}
        className="sale-inquiry-success-dialog fixed inset-0 m-auto w-[min(90vw,28rem)] max-w-none overflow-visible rounded-3xl border-0 bg-transparent p-0 text-center shadow-none backdrop:bg-[#171323]/60 backdrop:backdrop-blur-sm"
      >
        <div className="sale-inquiry-success-card relative overflow-hidden rounded-3xl border border-white/70 bg-white px-6 pb-7 pt-8 shadow-[0_24px_80px_rgba(27,26,46,0.28)] sm:px-9 sm:pb-9 sm:pt-10">
          <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-[#F6EAF0]" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 -left-12 h-36 w-36 rounded-full bg-[#EEF7F1]" />
          <div className="relative">
            <div className="sale-inquiry-success-icon mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-8 ring-emerald-50/60">
              <svg viewBox="0 0 52 52" fill="none" aria-hidden="true" className="h-14 w-14">
                <circle className="sale-inquiry-success-circle" cx="26" cy="26" r="23" stroke="currentColor" strokeWidth="2.5" />
                <path className="sale-inquiry-success-check" d="m15 27 7 7 15-16" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Inquiry received</p>
            <h2 id={`${instanceId}-success-title`} className="mt-2 text-2xl font-semibold tracking-tight text-[#1B1A2E] sm:text-3xl">
              You&apos;re one step closer
            </h2>
            <p id={`${instanceId}-success-description`} className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#5F5D69]">
              Our property sales team has received your inquiry about{" "}
              <span className="font-semibold text-[#383746]">{propertyTitle}</span>. We&apos;ll be in touch soon.
            </p>
            <button
              ref={successDoneRef}
              type="button"
              onClick={() => successDialogRef.current?.close()}
              className="mt-7 min-h-12 w-full rounded-xl bg-[#9C2454] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#7D1D43] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9C2454] active:scale-[0.99]"
            >
              Done
            </button>
            <p className="mt-3 text-xs text-[#777582]">Thank you for choosing Dominium.</p>
          </div>
        </div>
      </dialog>
    );
  }
}

function renderInquiryFields({
  propertyTitle,
  inputStyle,
  error,
  sending,
  includeHeading,
}: {
  propertyTitle: string;
  inputStyle: string;
  error: string;
  sending: boolean;
  includeHeading: boolean;
}) {
  return (
    <>
      {includeHeading && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#9C2454]">Interested?</p>
          <h2 className="mt-1 text-lg font-semibold text-[#1B1A2E]">Ask about this property</h2>
          <p className="mt-1 text-xs leading-5 text-[#5F5D69]">Our sales team will follow up. Seller contact details stay private.</p>
        </div>
      )}
      <label className="block text-sm font-medium text-[#383746]">
        Your name
        <input name="name" required minLength={2} maxLength={100} autoComplete="name" className={inputStyle} />
      </label>
      <label className="block text-sm font-medium text-[#383746]">
        Phone number
        <input name="phone" type="tel" required maxLength={40} autoComplete="tel" placeholder="+254 7XX XXX XXX" className={inputStyle} />
      </label>
      <label className="block text-sm font-medium text-[#383746]">
        Email <span className="font-normal text-[#777582]">(optional)</span>
        <input name="email" type="email" maxLength={254} autoComplete="email" className={inputStyle} />
      </label>
      <details className="group rounded-lg border border-[#EEEAE5] px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium text-[#9C2454] marker:text-[#9C2454]">
          Add buying details or a message <span className="font-normal text-[#777582]">(optional)</span>
        </summary>
        <p className="mt-2 text-xs leading-5 text-[#6B6A78]">
          A short message about this property is included automatically. Open this section to edit it or share more.
        </p>
        <div className="mt-3 space-y-3">
          <label className="block text-sm font-medium text-[#383746]">
            Interest
            <select name="interest_type" className={inputStyle}>
              <option value="">Not specified</option>
              <option value="general_question">General question</option>
              <option value="viewing">Arrange a viewing</option>
              <option value="offer">Make an offer</option>
              <option value="investment">Investment details</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-[#383746]">
            Buyer funding
            <select name="buyer_funding" className={inputStyle}>
              <option value="">Not specified</option>
              <option value="cash">Cash</option>
              <option value="mortgage">Mortgage</option>
              <option value="unsure">Unsure</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-[#383746]">
            Buying timeline
            <select name="timeline" className={inputStyle}>
              <option value="">Not specified</option>
              <option value="within_1_month">Within 1 month</option>
              <option value="1_to_3_months">1–3 months</option>
              <option value="3_to_6_months">3–6 months</option>
              <option value="flexible">Flexible</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-[#383746]">
            Preferred contact
            <select name="preferred_contact" className={inputStyle}>
              <option value="">Not specified</option>
              <option value="phone">Phone</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-[#383746]">
            Message
            <textarea
              name="message"
              rows={2}
              required
              minLength={10}
              maxLength={1200}
              defaultValue={`Hello, I am interested in ${propertyTitle}. Please share more details.`}
              className={inputStyle}
            />
          </label>
        </div>
      </details>
      <div className="border-t border-[#EEEAE5] pt-3">
        <label className="flex items-start gap-2 text-xs leading-5 text-[#5F5D69]">
          <input name="consent" type="checkbox" required className="mt-1 accent-[#9C2454]" />
          <span>
            I consent to Dominium using my contact details to respond to this inquiry, in line with applicable data protection requirements and the{" "}
            <Link href="/legal/guest-privacy-policy" className="font-medium text-[#9C2454] underline">Privacy Policy</Link>.
          </span>
        </label>
      </div>
      <label aria-hidden="true" className="hidden">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={sending} className="sticky bottom-0 min-h-11 w-full rounded-lg bg-[#9C2454] px-4 py-2 text-sm font-semibold text-white shadow-[0_-4px_12px_rgba(255,255,255,0.95)] hover:bg-[#7D1D43] disabled:opacity-60">
        {sending ? "Sending…" : "Send inquiry"}
      </button>
    </>
  );
}
