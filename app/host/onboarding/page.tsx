"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getHostOnboardingStatus,
  submitHostOnboarding,
} from "@/app/lib/host/actions";

type HostType = "individual" | "company";

type FormState = {
  // Host details
  fullName: string;
  phone: string;
  alternatePhone: string;
  email: string;
  hostType: HostType;
  businessName: string;
  dateOfBirth: string;
  county: string;
  residentialAddress: string;
  // Payout
  payoutMethod: "mpesa";
  mpesaNumber: string;
  // About & terms
  hostBio: string;
  agreedToHostTerms: boolean;
};

const initialState: FormState = {
  fullName: "",
  phone: "",
  alternatePhone: "",
  email: "",
  hostType: "individual",
  businessName: "",
  dateOfBirth: "",
  county: "",
  residentialAddress: "",
  payoutMethod: "mpesa",
  mpesaNumber: "",
  hostBio: "",
  agreedToHostTerms: false,
};

const KENYA_COUNTIES = [
  "Mombasa", "Kwale", "Kilifi", "Tana River", "Lamu", "Taita-Taveta", "Garissa", "Wajir",
  "Mandera", "Marsabit", "Isiolo", "Meru", "Tharaka-Nithi", "Embu", "Kitui", "Machakos",
  "Makueni", "Nyandarua", "Nyeri", "Kirinyaga", "Murang'a", "Kiambu", "Turkana", "West Pokot",
  "Samburu", "Trans Nzoia", "Uasin Gishu", "Elgeyo-Marakwet", "Nandi", "Baringo", "Laikipia",
  "Nakuru", "Narok", "Kajiado", "Kericho", "Bomet", "Kakamega", "Vihiga", "Bungoma", "Busia",
  "Siaya", "Kisumu", "Homa Bay", "Migori", "Kisii", "Nyamira", "Nairobi",
];

const MPESA_REGEX = /^0\d{9}$/;

function calculateAge(dob: string) {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function HostOnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void getHostOnboardingStatus()
      .then((status) => {
        if (!active) return;
        if (!status) {
          setCheckingStatus(false);
          return;
        }
        if (status.host_verified_at || status.kyc_status === "approved") {
          router.replace("/host");
          return;
        }
        if (status.kyc_status === "pending" || (status.kyc_submitted_at && status.kyc_status !== "rejected")) {
          router.replace("/host/pending-review");
          return;
        }
        if (status.kyc_status === "rejected") {
          setRejectionReason(status.kyc_rejection_reason ?? "Please review and update your host details.");
          const payoutDetails = status.payout_details as Record<string, string> | null;
          setForm((current) => ({
            ...current,
            fullName: status.full_name ?? current.fullName,
            phone: status.phone ?? current.phone,
            alternatePhone: status.alternate_phone ?? current.alternatePhone,
            email: status.email ?? current.email,
            hostType: status.host_type === "company" ? "company" : "individual",
            businessName: status.business_name ?? current.businessName,
            dateOfBirth: status.date_of_birth ?? current.dateOfBirth,
            county: status.county ?? current.county,
            residentialAddress: status.residential_address ?? current.residentialAddress,
            payoutMethod: "mpesa",
            mpesaNumber: payoutDetails?.mpesa_number ?? payoutDetails?.phone ?? current.mpesaNumber,
            hostBio: status.host_bio ?? current.hostBio,
          }));
        }
        setCheckingStatus(false);
      })
      .catch((statusError: unknown) => {
        if (!active) return;
        setError(
          statusError instanceof Error
            ? statusError.message
            : "Unable to check your host account status.",
        );
        setCheckingStatus(false);
      });

    return () => {
      active = false;
    };
  }, [router]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validateStep(stepToValidate: number): string | null {
    if (stepToValidate === 0) {
      if (!form.fullName.trim()) return "Full legal name is required.";
      if (!MPESA_REGEX.test(form.phone)) return "Enter a valid phone number, e.g. 0712345678.";
      if (form.alternatePhone && !MPESA_REGEX.test(form.alternatePhone)) {
        return "Alternate mobile number looks invalid — use e.g. 0712345678.";
      }
      if (!/^\S+@\S+\.\S+$/.test(form.email)) return "Enter a valid email address.";
      if (!form.dateOfBirth) return "Date of birth is required.";
      const age = calculateAge(form.dateOfBirth);
      if (age !== null && age < 18) return "You must be at least 18 years old to host.";
      if (!form.county) return "Select your county of residence.";
      if (!form.residentialAddress.trim()) return "Residential address is required.";
      if (form.hostType === "company" && !form.businessName.trim()) {
        return "Company name is required for company hosts.";
      }
    }
    if (stepToValidate === 1 && !MPESA_REGEX.test(form.mpesaNumber)) {
      return "Enter a valid M-Pesa number, e.g. 0712345678.";
    }
    if (stepToValidate === 2 && !form.agreedToHostTerms) {
      return "You must accept the Host Listing Agreement and Terms of Service.";
    }
    return null;
  }

  function validate(): string | null {
    for (let currentStep = 0; currentStep < 3; currentStep++) {
      const validationError = validateStep(currentStep);
      if (validationError) return validationError;
    }
    return null;
  }

  function goToNextStep() {
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setStep((current) => Math.min(current + 1, 2));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSubmitting(true);

    const payload = new FormData();
    payload.set("fullName", form.fullName);
    payload.set("phone", form.phone);
    payload.set("alternatePhone", form.alternatePhone);
    payload.set("email", form.email);
    payload.set("hostType", form.hostType);
    payload.set("businessName", form.businessName);
    payload.set("dateOfBirth", form.dateOfBirth);
    payload.set("county", form.county);
    payload.set("residentialAddress", form.residentialAddress);
    payload.set("payoutMethod", form.payoutMethod);
    payload.set("mpesaNumber", form.mpesaNumber);
    payload.set("hostBio", form.hostBio);
    payload.set("agreedToHostTerms", String(form.agreedToHostTerms));

    try {
      await submitHostOnboarding(payload);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to save host details.");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    router.push("/host/pending-review");
  }

  const inputClass = "mt-2 w-full rounded-xl border border-[#E9E6DD] bg-[#FDFCFB] px-4 py-3 text-[#1B1A2E] transition placeholder:text-gray-400 focus:border-[#E23E85] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#E23E85]/10";
  const labelClass = "block text-sm font-semibold text-[#3A3856]";
  const stepTitles = ["Your details", "Payout details", "Review & submit"];

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-9rem)] w-full max-w-4xl flex-col justify-center py-4 sm:py-8">
      {checkingStatus && (
        <p className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-500 shadow-sm">
          Checking your host account status…
        </p>
      )}
      {!checkingStatus && (
        <>
          {rejectionReason && (
            <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">
              <p className="font-semibold">Changes needed before we can verify your host account</p>
              <p className="mt-1 leading-6">{rejectionReason}</p>
              <p className="mt-2 text-rose-800">Your saved details are filled in below. Update any information that needs changing.</p>
            </div>
          )}

          <div className="relative isolate mx-auto w-full max-w-3xl">
            <div aria-hidden="true" className="pointer-events-none absolute -inset-x-5 -inset-y-4 -z-10 rounded-[2.5rem] bg-[#FDF0F5] blur-xl sm:-inset-x-8 sm:-inset-y-6" />
            <div className="overflow-hidden rounded-[1.75rem] border border-white/80 bg-white shadow-[0_28px_90px_rgba(27,26,46,0.16)] ring-1 ring-[#1B1A2E]/[0.04] sm:rounded-[2rem]">
              <header className="relative overflow-hidden bg-[#1B1A2E] p-6 text-white sm:p-8">
                <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-20 h-48 w-48 rounded-full border border-white/10" />
                <div className="relative">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#FBE8EF]">Become a host</p>
                  <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Let&apos;s get you set up</h1>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
                    A few details help us keep your account secure and make sure payouts reach you.
                  </p>
                  <div className="mt-7 flex items-center gap-2" aria-label={`Step ${step + 1} of 3: ${stepTitles[step]}`}>
                    {stepTitles.map((title, index) => (
                      <div key={title} className="flex min-w-0 flex-1 items-center gap-2">
                        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
                          index < step ? "bg-[#E23E85] text-white" :
                          index === step ? "bg-white text-[#1B1A2E] ring-4 ring-white/15" :
                          "border border-white/30 text-white/60"
                        }`}>
                          {index < step ? "✓" : index + 1}
                        </span>
                        <span className={`hidden truncate text-xs font-medium sm:block ${
                          index === step ? "text-white" : "text-white/55"
                        }`}>{title}</span>
                        {index < stepTitles.length - 1 && (
                          <span className={`h-px min-w-2 flex-1 ${index < step ? "bg-[#E23E85]" : "bg-white/20"}`} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </header>

              <form onSubmit={handleSubmit} className="host-onboarding-form">
                <section className="bg-white p-5 sm:p-8">
              <div className="mb-7 border-b border-gray-100 pb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#E23E85]">Step {step + 1} of 3</p>
                <h2 className="mt-1 text-xl font-bold text-[#12231d] sm:text-2xl">{stepTitles[step]}</h2>
                <p className="mt-1 text-sm leading-6 text-gray-500">
                  {step === 0 && "Tell us who you are and where you are based."}
                  {step === 1 && "Choose where you would like to receive your host payouts."}
                  {step === 2 && "Check your details and confirm the host terms to send your application."}
                </p>
              </div>

              {step === 0 && (
                <div className="space-y-5">
                  <label className={labelClass}>
                    Full legal name
                    <input required className={inputClass} value={form.fullName} onChange={(e) => update("fullName", e.target.value)} autoComplete="name" />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className={labelClass}>
                      Phone number
                      <input required type="tel" placeholder="0712345678" className={inputClass} value={form.phone} onChange={(e) => update("phone", e.target.value)} />
                    </label>
                    <label className={labelClass}>
                      Alternate mobile number <span className="font-normal text-gray-500">(optional)</span>
                      <input type="tel" placeholder="0712345678" className={inputClass} value={form.alternatePhone} onChange={(e) => update("alternatePhone", e.target.value)} />
                    </label>
                  </div>

                  <label className={labelClass}>
                    Email address
                    <input required type="email" className={inputClass} value={form.email} onChange={(e) => update("email", e.target.value)} autoComplete="email" />
                  </label>

                  <fieldset className="rounded-2xl border border-gray-100 bg-[#fbfcfb] p-4">
                    <legend className="px-1 text-sm font-semibold text-[#3A3856]">I&apos;m registering as</legend>
                    <div className="mt-1 flex flex-wrap gap-3">
                      {(["individual", "company"] as const).map((type) => (
                        <label key={type} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                          form.hostType === type ? "border-[#E23E85]/40 bg-[#E23E85]/5 text-[#12231d]" : "border-gray-200 bg-white text-gray-600"
                        }`}>
                          <input type="radio" name="hostType" checked={form.hostType === type} onChange={() => update("hostType", type)} className="accent-[#E23E85]" />
                          {type === "individual" ? "An individual" : "A company"}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {form.hostType === "company" && (
                    <label className={labelClass}>
                      Company / business name
                      <input required className={inputClass} value={form.businessName} onChange={(e) => update("businessName", e.target.value)} autoComplete="organization" />
                    </label>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className={labelClass}>
                      Date of birth
                      <input required type="date" className={inputClass} value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} />
                    </label>
                    <label className={labelClass}>
                      County of residence
                      <input required list="kenya-counties" className={inputClass} value={form.county} onChange={(e) => update("county", e.target.value)} placeholder="Start typing…" />
                      <datalist id="kenya-counties">
                        {KENYA_COUNTIES.map((county) => <option key={county} value={county} />)}
                      </datalist>
                    </label>
                  </div>

                  <label className={labelClass}>
                    Residential address
                    <textarea required rows={2} className={inputClass} value={form.residentialAddress} onChange={(e) => update("residentialAddress", e.target.value)} placeholder="Street, building, estate" />
                  </label>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-[#F4D6E2] bg-[#FDF0F5] p-4">
                    <p className="text-sm font-semibold text-[#9C2454]">Simple, secure payouts</p>
                    <p className="mt-1 text-sm leading-6 text-[#6B6A78]">Host payouts are sent to a Safaricom M-Pesa number. Make sure the number can receive payments.</p>
                  </div>
                  <label className={labelClass}>
                    M-Pesa number
                    <input required type="tel" inputMode="tel" autoComplete="tel" placeholder="0712345678" className={inputClass} value={form.mpesaNumber} onChange={(e) => update("mpesaNumber", e.target.value)} />
                  </label>
                  <label className={labelClass}>
                    About you <span className="font-normal text-gray-500">(optional)</span>
                    <textarea rows={5} className={inputClass} value={form.hostBio} onChange={(e) => update("hostBio", e.target.value)} placeholder="Share a little about yourself and what guests can expect when they stay with you." />
                  </label>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <dl className="grid gap-3 rounded-2xl bg-[#f7f9f7] p-5 text-sm sm:grid-cols-2">
                    <div><dt className="text-gray-500">Full name</dt><dd className="mt-1 font-semibold text-[#12231d]">{form.fullName}</dd></div>
                    <div><dt className="text-gray-500">Host type</dt><dd className="mt-1 font-semibold capitalize text-[#12231d]">{form.hostType}{form.hostType === "company" && form.businessName ? ` · ${form.businessName}` : ""}</dd></div>
                    <div><dt className="text-gray-500">Email</dt><dd className="mt-1 font-semibold text-[#12231d]">{form.email}</dd></div>
                    <div><dt className="text-gray-500">Phone</dt><dd className="mt-1 font-semibold text-[#12231d]">{form.phone}</dd></div>
                    <div><dt className="text-gray-500">County</dt><dd className="mt-1 font-semibold text-[#12231d]">{form.county}</dd></div>
                    <div><dt className="text-gray-500">Payout number</dt><dd className="mt-1 font-semibold text-[#12231d]">{form.mpesaNumber}</dd></div>
                  </dl>

                  <label className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-sm leading-6 text-[#34473f]">
                    <input
                      type="checkbox"
                      checked={form.agreedToHostTerms}
                      onChange={(e) => update("agreedToHostTerms", e.target.checked)}
                      className="mt-1 h-4 w-4 shrink-0 accent-[#E23E85]"
                      required
                    />
                    <span>
                      I accept and agree to the{" "}
                      <Link href="/host-listing-agreement-and-terms-of-service" target="_blank" className="font-semibold text-[#9C2454] underline underline-offset-2">
                        Host Listing Agreement and Terms of Service
                      </Link>
                      . I confirm that I am the legal owner or authorized manager of the properties I list, and that the
                      information provided above is accurate.
                    </span>
                  </label>
                  <p className="text-xs leading-5 text-gray-500">You can go back to any step to make changes before submitting.</p>
                </div>
              )}

              {error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}

              <div className="mt-8 flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => { setError(null); setStep((current) => Math.max(current - 1, 0)); }}
                  disabled={step === 0 || submitting}
                  className="rounded-xl px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:invisible"
                >
                  Back
                </button>
                {step < 2 ? (
                  <button type="button" onClick={goToNextStep} className="rounded-xl bg-[#12231d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#244137] focus:outline-none focus:ring-4 focus:ring-[#12231d]/15">
                    Continue <span aria-hidden="true">→</span>
                  </button>
                ) : (
                  <button type="submit" disabled={submitting} className="rounded-xl bg-[#12231d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#244137] focus:outline-none focus:ring-4 focus:ring-[#12231d]/15 disabled:cursor-wait disabled:opacity-60">
                    {submitting ? "Submitting your details…" : "Submit for review"}
                  </button>
                )}
              </div>
                </section>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
