"use client";

import { CSSProperties, FormEvent, useState } from "react";
import Navbar from "@/components/navigationBar";

/* ------------------------------------------------------------------ */
/*  EDIT THESE: your real contact details                              */
/* ------------------------------------------------------------------ */
const CONTACT = {
  phone: "+254 700 000 000",
  phoneHref: "tel:+254700000000",
  whatsappHref: "https://wa.me/254700000000",
  email: "hello@dominium.co.ke",
  address: "Add your office address here",
  mapsHref: "https://maps.google.com/?q=Nairobi,Kenya",
  hours: "Mon to Sat, 8:00am to 6:00pm (EAT)",
  replyTime: "We usually reply within 2 hours",
};

const TOPICS = [
  "Booking help",
  "List my property",
  "Payment issue",
  "Feedback",
  "Something else",
] as const;

const COUNTIES = ["Nairobi", "Mombasa", "Kilifi", "Nakuru", "Kisumu", "Other"];

const FAQS = [
  {
    q: "How do I change or cancel a booking?",
    a: "Send us your booking reference and the new dates, or tell us you want to cancel. Pick “Booking help” above so it reaches the right person. Refunds follow the host's cancellation policy shown on the listing.",
  },
  {
    q: "How do I list my apartment on Dominium?",
    a: "Choose “List my property” and tell us the county, the number of bedrooms and a phone number we can reach you on. We verify every listing before it goes live.",
  },
  {
    q: "Which payment methods are supported?",
    a: "M-Pesa is supported at checkout. If a payment went through but your booking isn't confirmed, send us the M-Pesa receipt and we'll sort it out.",
  },
  {
    q: "Are the properties really verified?",
    a: "Yes. Each host is contacted and each property is checked before it appears on the site. If something doesn't match its listing, tell us and we'll follow up with the host.",
  },
];

/* ------------------------------------------------------------------ */
/*  Neumorphic shadow tokens                                           */
/*  Set once on <main> as CSS variables, used via                      */
/*  [box-shadow:var(--raised)] etc. Change the two hex values here     */
/*  (dark / light) to retune every shadow on the page.                 */
/* ------------------------------------------------------------------ */
const DARK = "#c9cedb";
const LIGHT = "#ffffff";

const tokens = {
  "--raised": `9px 9px 20px ${DARK}, -9px -9px 20px ${LIGHT}`,
  "--raised-sm": `5px 5px 12px ${DARK}, -5px -5px 12px ${LIGHT}`,
  "--inset": `inset 5px 5px 11px ${DARK}, inset -5px -5px 11px ${LIGHT}`,
  "--inset-sm": `inset 3px 3px 7px ${DARK}, inset -3px -3px 7px ${LIGHT}`,
} as CSSProperties;

/* Reused class groups (full literal strings so Tailwind can see them) */
const INPUT =
  "w-full rounded-[14px] border-0 bg-[#eceef3] px-4 py-3.5 text-[#1f2937] " +
  "[box-shadow:var(--inset)] placeholder:text-[#7a8396] transition-shadow duration-200 " +
  "focus-visible:outline-none focus-visible:[box-shadow:var(--inset),0_0_0_2px_#e8337a] " +
  "aria-[invalid=true]:[box-shadow:var(--inset),0_0_0_2px_#b4233a] motion-reduce:transition-none";

const LABEL = "mb-2.5 block p-0 text-sm font-bold";
const ERROR = "mt-2 text-sm font-semibold text-[#b4233a]";
const ICON_WELL =
  "grid h-12 w-12 flex-none place-items-center rounded-full text-[#d1226b] [box-shadow:var(--inset-sm)]";

/* ------------------------------------------------------------------ */
/*  Types + validation                                                 */
/* ------------------------------------------------------------------ */
type Values = {
  name: string;
  email: string;
  phone: string;
  county: string;
  topic: string;
  message: string;
  consent: boolean;
  website: string; // honeypot, must stay empty
};

type Errors = Partial<Record<keyof Values, string>>;
type Status = "idle" | "sending" | "success" | "error";

const MAX_MESSAGE = 800;

const initial: Values = {
  name: "",
  email: "",
  phone: "",
  county: "",
  topic: TOPICS[0],
  message: "",
  consent: false,
  website: "",
};

// Accepts 07xx xxx xxx, 01xx xxx xxx, +2547xx..., +2541xx..., 2547xx...
const KE_PHONE = /^(?:\+?254|0)[17]\d{8}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(v: Values): Errors {
  const e: Errors = {};
  if (v.name.trim().length < 2) e.name = "Enter your full name.";
  if (!EMAIL.test(v.email.trim()))
    e.email = "Enter a valid email, like name@example.com.";
  if (v.phone.trim() && !KE_PHONE.test(v.phone.replace(/[\s-]/g, "")))
    e.phone = "Use a Kenyan number, like 0712 345 678 or +254 712 345 678.";
  if (v.message.trim().length < 10)
    e.message = "Tell us a bit more (at least 10 characters).";
  if (v.message.length > MAX_MESSAGE)
    e.message = `Keep it under ${MAX_MESSAGE} characters.`;
  if (!v.consent) e.consent = "Please agree so we can reply to you.";
  return e;
}

/* ------------------------------------------------------------------ */
/*  Icons (inline so there are no extra dependencies)                  */
/* ------------------------------------------------------------------ */
const Icon = ({
  d,
  className = "h-[22px] w-[22px]",
  strokeWidth = 1.8,
}: {
  d: string | string[];
  className?: string;
  strokeWidth?: number;
}) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {(Array.isArray(d) ? d : [d]).map((p, i) => (
      <path key={i} d={p} />
    ))}
  </svg>
);

const ICONS = {
  phone:
    "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
  chat: [
    "M21 12a8 8 0 0 1-11.7 7.1L4 20l1-4.6A8 8 0 1 1 21 12z",
    "M9 10h6M9 14h4",
  ],
  mail: [
    "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z",
    "m3 7 9 6 9-6",
  ],
  pin: [
    "M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z",
    "M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  ],
  clock: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 7v5l3 2"],
  check: "m5 12.5 4.5 4.5L19 7.5",
  chevron: "m6 9 6 6 6-6",
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
type Props = {
  /** API route that receives the JSON body. Defaults to /api/contact */
  endpoint?: string;
};

export default function ContactUs({ endpoint = "/api/contact" }: Props) {
  const [values, setValues] = useState<Values>(initial);
  const [touched, setTouched] = useState<
    Partial<Record<keyof Values, boolean>>
  >({});
  const [status, setStatus] = useState<Status>("idle");

  const errors = validate(values);
  const show = (k: keyof Values) => (touched[k] ? errors[k] : undefined);

  const set =
    <K extends keyof Values>(key: K) =>
    (value: Values[K]) =>
      setValues((p) => ({ ...p, [key]: value }));

  const blur = (k: keyof Values) => () =>
    setTouched((p) => ({ ...p, [k]: true }));

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    setTouched({
      name: true,
      email: true,
      phone: true,
      message: true,
      consent: true,
    });
    if (Object.keys(errors).length) {
      const first = (
        ["name", "email", "phone", "message", "consent"] as const
      ).find((k) => errors[k]);
      if (first) document.getElementById(`dm-${first}`)?.focus();
      return;
    }

    // Honeypot: bots fill hidden fields. Pretend it worked, send nothing.
    if (values.website) {
      setStatus("success");
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  function reset() {
    setValues(initial);
    setTouched({});
    setStatus("idle");
  }

  /* contact cards share one look: raised, press in on hover/tap */
  const channelCls =
    "flex items-center gap-4 rounded-[18px] bg-[#eceef3] px-5 py-[18px] text-inherit no-underline " +
    "[box-shadow:var(--raised-sm)] transition-shadow duration-200 " +
    "hover:[box-shadow:var(--inset-sm)] active:[box-shadow:var(--inset)] " +
    "focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#e8337a] " +
    "motion-reduce:transition-none";

  return (
    <>
      <Navbar />
      <main
        style={tokens}
        className="min-h-screen bg-[#eceef3] px-4 pb-24 pt-8 font-sans leading-relaxed text-[#1f2937] sm:px-8 sm:pt-14 lg:px-10 lg:pt-[72px]"
      >
        <div className="mx-auto max-w-[1120px]">
          {/* ---------- Header ---------- */}
          <header className="mb-8 max-w-[640px] sm:mb-14">
            <h1 className="mb-4 text-[2rem] font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
              How can we help with your stay?
            </h1>
            <p className="mb-6 max-w-[56ch] text-[1.0625rem] text-[#566074]">
              Questions about a booking, a payment, or listing your own place?
              Message us and a real person will get back to you.
            </p>
            <p className="inline-flex items-center gap-2.5 rounded-full px-[18px] py-2.5 text-sm font-semibold [box-shadow:var(--raised-sm)]">
              <span
                className="h-2.5 w-2.5 rounded-full bg-[#e8337a] shadow-[0_0_0_3px_rgba(232,51,122,0.18)]"
                aria-hidden="true"
              />
              {CONTACT.replyTime}
            </p>
          </header>

          <div className="grid items-start gap-6 md:grid-cols-[0.8fr_1.4fr] md:gap-12">
            {/* ---------- Left: channels ---------- */}
            <aside
              className="grid gap-[22px]"
              aria-label="Other ways to reach us"
            >
              <a className={channelCls} href={CONTACT.phoneHref}>
                <span className={ICON_WELL}>
                  <Icon d={ICONS.phone} />
                </span>
                <span>
                  <span className="block text-sm text-[#566074]">Call us</span>
                  <span className="block break-words font-bold">
                    {CONTACT.phone}
                  </span>
                </span>
              </a>

              <a
                className={channelCls}
                href={CONTACT.whatsappHref}
                target="_blank"
                rel="noreferrer"
              >
                <span className={ICON_WELL}>
                  <Icon d={ICONS.chat} />
                </span>
                <span>
                  <span className="block text-sm text-[#566074]">WhatsApp</span>
                  <span className="block break-words font-bold">
                    Chat with us
                  </span>
                </span>
              </a>

              <a className={channelCls} href={`mailto:${CONTACT.email}`}>
                <span className={ICON_WELL}>
                  <Icon d={ICONS.mail} />
                </span>
                <span>
                  <span className="block text-sm text-[#566074]">Email</span>
                  <span className="block break-words font-bold">
                    {CONTACT.email}
                  </span>
                </span>
              </a>

              <a
                className={channelCls}
                href={CONTACT.mapsHref}
                target="_blank"
                rel="noreferrer"
              >
                <span className={ICON_WELL}>
                  <Icon d={ICONS.pin} />
                </span>
                <span>
                  <span className="block text-sm text-[#566074]">Visit</span>
                  <span className="block break-words font-bold">
                    {CONTACT.address}
                  </span>
                </span>
              </a>

              {/* static info, so it doesn't react to hover */}
              <div className="flex items-center gap-4 rounded-[18px] bg-[#eceef3] px-5 py-[18px] [box-shadow:var(--raised-sm)]">
                <span className={ICON_WELL}>
                  <Icon d={ICONS.clock} />
                </span>
                <span>
                  <span className="block text-sm text-[#566074]">
                    Support hours
                  </span>
                  <span className="block break-words font-bold">
                    {CONTACT.hours}
                  </span>
                </span>
              </div>
            </aside>

            {/* ---------- Right: form ---------- */}
            <section
              className="rounded-[28px] bg-[#eceef3] p-5 [box-shadow:var(--raised)] sm:p-8 lg:p-11"
              aria-labelledby="dm-form-title"
            >
              {status === "success" ? (
                <div className="py-3 text-center sm:py-10" role="status">
                  <span className="mb-5 inline-grid h-[72px] w-[72px] place-items-center rounded-full text-[#d1226b] [box-shadow:var(--inset)]">
                    <Icon
                      d={ICONS.check}
                      className="h-[34px] w-[34px]"
                      strokeWidth={2.4}
                    />
                  </span>
                  <h2 className="mb-2.5 text-2xl font-extrabold leading-tight tracking-tight">
                    Message sent
                  </h2>
                  <p className="mb-6 text-[#566074]">
                    Thanks, {values.name.split(" ")[0] || "friend"}. We&apos;ll
                    reply to {values.email} as soon as we can.
                  </p>
                  <button
                    type="button"
                    onClick={reset}
                    className="cursor-pointer rounded-full border-0 bg-[#eceef3] px-[26px] py-3.5 font-bold text-[#1f2937] [box-shadow:var(--raised-sm)] transition-shadow duration-200 active:[box-shadow:var(--inset-sm)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1f2937] motion-reduce:transition-none"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={onSubmit} noValidate>
                  <h2
                    id="dm-form-title"
                    className="mb-6 text-2xl font-extrabold leading-tight tracking-tight"
                  >
                    Send us a message
                  </h2>

                  {/* Topic */}
                  <fieldset className="m-0 mb-6 min-w-0 border-0 p-0">
                    <legend className={LABEL}>What is this about?</legend>
                    <div className="flex flex-wrap gap-3.5">
                      {TOPICS.map((t) => (
                        <label key={t} className="relative cursor-pointer">
                          <input
                            type="radio"
                            name="topic"
                            value={t}
                            checked={values.topic === t}
                            onChange={() => set("topic")(t)}
                            className="peer absolute inset-0 m-0 cursor-pointer opacity-0"
                          />
                          <span className="inline-block rounded-full px-[18px] py-2.5 text-sm font-semibold [box-shadow:var(--raised-sm)] transition-[box-shadow,color] duration-200 peer-checked:text-[#d1226b] peer-checked:[box-shadow:var(--inset-sm)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-[3px] peer-focus-visible:outline-[#e8337a] motion-reduce:transition-none">
                            {t}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div className="grid sm:grid-cols-2 sm:gap-x-5">
                    {/* Name */}
                    <div className="mb-[22px] min-w-0">
                      <label htmlFor="dm-name" className={LABEL}>
                        Full name
                      </label>
                      <input
                        id="dm-name"
                        className={INPUT}
                        type="text"
                        autoComplete="name"
                        value={values.name}
                        onChange={(e) => set("name")(e.target.value)}
                        onBlur={blur("name")}
                        aria-invalid={!!show("name")}
                        aria-describedby={
                          show("name") ? "dm-name-err" : undefined
                        }
                      />
                      {show("name") && (
                        <p id="dm-name-err" className={ERROR}>
                          {show("name")}
                        </p>
                      )}
                    </div>

                    {/* Email */}
                    <div className="mb-[22px] min-w-0">
                      <label htmlFor="dm-email" className={LABEL}>
                        Email
                      </label>
                      <input
                        id="dm-email"
                        className={INPUT}
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        value={values.email}
                        onChange={(e) => set("email")(e.target.value)}
                        onBlur={blur("email")}
                        aria-invalid={!!show("email")}
                        aria-describedby={
                          show("email") ? "dm-email-err" : undefined
                        }
                      />
                      {show("email") && (
                        <p id="dm-email-err" className={ERROR}>
                          {show("email")}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 sm:gap-x-5">
                    {/* Phone */}
                    <div className="mb-[22px] min-w-0">
                      <label htmlFor="dm-phone" className={LABEL}>
                        Phone{" "}
                        <span className="font-normal text-[#566074]">
                          (optional)
                        </span>
                      </label>
                      <input
                        id="dm-phone"
                        className={INPUT}
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="0712 345 678"
                        value={values.phone}
                        onChange={(e) => set("phone")(e.target.value)}
                        onBlur={blur("phone")}
                        aria-invalid={!!show("phone")}
                        aria-describedby={
                          show("phone") ? "dm-phone-err" : undefined
                        }
                      />
                      {show("phone") && (
                        <p id="dm-phone-err" className={ERROR}>
                          {show("phone")}
                        </p>
                      )}
                    </div>

                    {/* County */}
                    <div className="mb-[22px] min-w-0">
                      <label htmlFor="dm-county" className={LABEL}>
                        County{" "}
                        <span className="font-normal text-[#566074]">
                          (optional)
                        </span>
                      </label>
                      <div className="relative">
                        <select
                          id="dm-county"
                          className={`${INPUT} cursor-pointer appearance-none pr-11`}
                          value={values.county}
                          onChange={(e) => set("county")(e.target.value)}
                        >
                          <option value="">Select a county</option>
                          {COUNTIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        <span
                          className="pointer-events-none absolute right-3.5 top-1/2 grid -translate-y-1/2 text-[#566074]"
                          aria-hidden="true"
                        >
                          <Icon d={ICONS.chevron} />
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Message */}
                  <div className="mb-[22px] min-w-0">
                    <label htmlFor="dm-message" className={LABEL}>
                      Message
                    </label>
                    <textarea
                      id="dm-message"
                      className={`${INPUT} min-h-[130px] resize-y`}
                      rows={5}
                      value={values.message}
                      onChange={(e) => set("message")(e.target.value)}
                      onBlur={blur("message")}
                      aria-invalid={!!show("message")}
                      aria-describedby={`dm-message-count${show("message") ? " dm-message-err" : ""}`}
                    />
                    <div className="mt-2 flex items-start justify-between gap-3">
                      {show("message") ? (
                        <p
                          id="dm-message-err"
                          className="text-sm font-semibold text-[#b4233a]"
                        >
                          {show("message")}
                        </p>
                      ) : (
                        <span />
                      )}
                      <span
                        id="dm-message-count"
                        className={`ml-auto text-xs tabular-nums ${
                          values.message.length > MAX_MESSAGE
                            ? "font-bold text-[#b4233a]"
                            : "text-[#566074]"
                        }`}
                      >
                        {values.message.length}/{MAX_MESSAGE}
                      </span>
                    </div>
                  </div>

                  {/* Honeypot (hidden from people, visible to bots) */}
                  <div
                    className="absolute -left-[9999px] h-px w-px overflow-hidden"
                    aria-hidden="true"
                  >
                    <label htmlFor="dm-website">Leave this field empty</label>
                    <input
                      id="dm-website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={values.website}
                      onChange={(e) => set("website")(e.target.value)}
                    />
                  </div>

                  {/* Consent */}
                  <div className="mb-[22px] min-w-0">
                    <label className="flex cursor-pointer items-start gap-3.5 text-[0.92rem]">
                      <input
                        id="dm-consent"
                        type="checkbox"
                        checked={values.consent}
                        onChange={(e) => set("consent")(e.target.checked)}
                        onBlur={blur("consent")}
                        aria-invalid={!!show("consent")}
                        aria-describedby={
                          show("consent") ? "dm-consent-err" : undefined
                        }
                        className="peer sr-only"
                      />
                      <span
                        className="grid h-7 w-7 flex-none place-items-center rounded-[9px] text-transparent transition-colors duration-150 [box-shadow:var(--inset-sm)] peer-checked:text-[#d1226b] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-[3px] peer-focus-visible:outline-[#e8337a] peer-aria-[invalid=true]:outline-2 peer-aria-[invalid=true]:outline-offset-2 peer-aria-[invalid=true]:outline-[#b4233a] motion-reduce:transition-none"
                        aria-hidden="true"
                      >
                        <Icon
                          d={ICONS.check}
                          className="h-[18px] w-[18px]"
                          strokeWidth={2.6}
                        />
                      </span>
                      <span>
                        I agree that Dominium can contact me about this message.
                      </span>
                    </label>
                    {show("consent") && (
                      <p id="dm-consent-err" className={ERROR}>
                        {show("consent")}
                      </p>
                    )}
                  </div>

                  {status === "error" && (
                    <p
                      className="mb-5 rounded-[14px] px-4 py-3.5 font-semibold text-[#b4233a] [box-shadow:var(--inset-sm)]"
                      role="alert"
                    >
                      Your message didn&apos;t send. Check your connection and
                      try again, or reach us on WhatsApp.
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={status === "sending"}
                    aria-busy={status === "sending"}
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-full border-0 bg-[#d1226b] px-7 py-4 text-[1.05rem] font-bold text-white shadow-[7px_7px_16px_#c9cedb,-7px_-7px_16px_#ffffff] transition duration-200 hover:enabled:brightness-105 active:enabled:shadow-[inset_4px_4px_9px_rgba(0,0,0,0.28),inset_-3px_-3px_8px_rgba(255,255,255,0.18)] disabled:cursor-progress disabled:saturate-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1f2937] motion-reduce:transition-none sm:w-auto sm:min-w-[220px]"
                  >
                    {status === "sending" ? (
                      <>
                        <span
                          className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none"
                          aria-hidden="true"
                        />
                        Sending
                      </>
                    ) : (
                      "Send message"
                    )}
                  </button>
                </form>
              )}
            </section>
          </div>

          {/* ---------- FAQ ---------- */}
          <section
            className="mt-12 sm:mt-[88px]"
            aria-labelledby="dm-faq-title"
          >
            <h2
              id="dm-faq-title"
              className="mb-6 text-2xl font-extrabold leading-tight tracking-tight"
            >
              Quick answers
            </h2>
            <div className="grid items-start gap-[22px] md:grid-cols-2">
              {FAQS.map((f) => (
                <details
                  key={f.q}
                  className="group rounded-[18px] bg-[#eceef3] [box-shadow:var(--raised-sm)] transition-shadow duration-200 open:[box-shadow:var(--inset)] motion-reduce:transition-none"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-[18px] px-5 py-[18px] font-bold focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#e8337a] [&::-webkit-details-marker]:hidden">
                    <span>{f.q}</span>
                    <span
                      className="grid flex-none text-[#d1226b] transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
                      aria-hidden="true"
                    >
                      <Icon d={ICONS.chevron} />
                    </span>
                  </summary>
                  <p className="m-0 max-w-[60ch] px-5 pb-5 text-[#566074]">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
