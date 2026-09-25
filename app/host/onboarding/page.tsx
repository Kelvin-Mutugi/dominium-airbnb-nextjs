"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getHostOnboardingStatus,
  submitHostOnboarding,
} from "@/app/lib/host/actions";

type HostType = "individual" | "company";
type IdType = "national_id" | "passport";

type FormState = {
  // Identity & KYC
  fullName: string;
  phone: string;
  alternatePhone: string;
  email: string;
  hostType: HostType;
  businessName: string;
  idType: IdType;
  idNumber: string;
  idDocument: File | null;
  dateOfBirth: string;
  county: string;
  residentialAddress: string;
  // Payout
  payoutMethod: "mpesa" | "bank";
  mpesaNumber: string;
  bankName: string;
  bankAccount: string;
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
  idType: "national_id",
  idNumber: "",
  idDocument: null,
  dateOfBirth: "",
  county: "",
  residentialAddress: "",
  payoutMethod: "mpesa",
  mpesaNumber: "",
  bankName: "",
  bankAccount: "",
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
          setRejectionReason(status.kyc_rejection_reason ?? "Please review your details and upload a clear identity document.");
          const payoutDetails = status.payout_details as Record<string, string> | null;
          setForm((current) => ({
            ...current,
            fullName: status.full_name ?? current.fullName,
            phone: status.phone ?? current.phone,
            alternatePhone: status.alternate_phone ?? current.alternatePhone,
            email: status.email ?? current.email,
            hostType: status.host_type === "company" ? "company" : "individual",
            businessName: status.business_name ?? current.businessName,
            idType: status.id_document_type === "passport" ? "passport" : "national_id",
            idNumber: status.id_number ?? current.idNumber,
            dateOfBirth: status.date_of_birth ?? current.dateOfBirth,
            county: status.county ?? current.county,
            residentialAddress: status.residential_address ?? current.residentialAddress,
            payoutMethod: status.payout_method === "bank" ? "bank" : "mpesa",
            mpesaNumber: payoutDetails?.mpesa_number ?? payoutDetails?.phone ?? current.mpesaNumber,
            bankName: payoutDetails?.bank_name ?? current.bankName,
            bankAccount: payoutDetails?.account_number ?? current.bankAccount,
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

  function validate(): string | null {
    if (!form.fullName.trim()) return "Full legal name is required.";
    if (!MPESA_REGEX.test(form.phone)) return "Enter a valid phone number, e.g. 0712345678.";
    if (form.alternatePhone && !MPESA_REGEX.test(form.alternatePhone)) {
      return "Alternate mobile number looks invalid — use e.g. 0712345678.";
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return "Enter a valid email address.";
    if (!form.idNumber.trim()) return `${form.idType === "passport" ? "Passport" : "National ID"} number is required.`;
    if (!form.idDocument) return "Please upload a copy of your ID or passport.";
    if (!form.dateOfBirth) return "Date of birth is required.";
    const age = calculateAge(form.dateOfBirth);
    if (age !== null && age < 18) return "You must be at least 18 years old to host.";
    if (!form.county) return "Select your county of residence.";
    if (!form.residentialAddress.trim()) return "Residential address is required.";
    if (form.hostType === "company" && !form.businessName.trim()) return "Company name is required for company hosts.";
    if (form.payoutMethod === "mpesa" && !MPESA_REGEX.test(form.mpesaNumber)) {
      return "Enter a valid M-Pesa number, e.g. 0712345678.";
    }
    if (form.payoutMethod === "bank" && (!form.bankName || !form.bankAccount)) {
      return "Bank name and account number are both required.";
    }
    if (!form.agreedToHostTerms) return "You must accept the Host Listing Agreement and Terms of Service.";
    return null;
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
    payload.set("idType", form.idType);
    payload.set("idNumber", form.idNumber);
    if (form.idDocument) payload.set("idDocument", form.idDocument);
    payload.set("dateOfBirth", form.dateOfBirth);
    payload.set("county", form.county);
    payload.set("residentialAddress", form.residentialAddress);
    payload.set("payoutMethod", form.payoutMethod);
    payload.set("mpesaNumber", form.mpesaNumber);
    payload.set("bankName", form.bankName);
    payload.set("bankAccount", form.bankAccount);
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

  const inputClass = "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[#ec1561] focus:outline-none focus:ring-1 focus:ring-[#ec1561]";
  const labelClass = "block text-sm font-medium text-[#12231d]";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {checkingStatus && (
        <p className="rounded-lg bg-white p-6 text-sm text-gray-500 shadow-sm">
          Checking your host account status…
        </p>
      )}
      {!checkingStatus && (
        <>
      {rejectionReason && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">
          <p className="font-semibold">Changes needed before we can verify your host account</p>
          <p className="mt-1 leading-6">{rejectionReason}</p>
          <p className="mt-2 text-rose-800">Your saved details are filled in below. Update what is needed and upload the corrected ID document.</p>
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold text-[#12231d]">Set up your host account</h1>
        <p className="text-gray-500">We use these details to verify your identity and process payouts.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Identity & KYC */}
        <section className="space-y-5 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-[#12231d]">Identity verification</h2>

          <label className={labelClass}>
            Full legal name
            <input required className={inputClass} value={form.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="As it appears on your ID" />
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
            <input required type="email" className={inputClass} value={form.email} onChange={(e) => update("email", e.target.value)} />
          </label>

          <fieldset className="space-y-2 text-sm text-[#12231d]">
            <legend className="font-medium">Host type</legend>
            <label className="mr-5 inline-flex items-center gap-2">
              <input type="radio" checked={form.hostType === "individual"} onChange={() => update("hostType", "individual")} /> Individual
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" checked={form.hostType === "company"} onChange={() => update("hostType", "company")} /> Company
            </label>
          </fieldset>

          {form.hostType === "company" && (
            <label className={labelClass}>
              Company / business name
              <input required className={inputClass} value={form.businessName} onChange={(e) => update("businessName", e.target.value)} />
            </label>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <fieldset className="space-y-2 text-sm text-[#12231d]">
              <legend className="font-medium">ID type</legend>
              <label className="mr-5 inline-flex items-center gap-2">
                <input type="radio" checked={form.idType === "national_id"} onChange={() => update("idType", "national_id")} /> National ID
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="radio" checked={form.idType === "passport"} onChange={() => update("idType", "passport")} /> Passport
              </label>
            </fieldset>
            <label className={labelClass}>
              {form.idType === "passport" ? "Passport number" : "National ID number"}
              <input required className={inputClass} value={form.idNumber} onChange={(e) => update("idNumber", e.target.value)} />
            </label>
          </div>

          <label className={labelClass}>
            Upload ID document <span className="font-normal text-gray-500">(front side, clear photo or scan)</span>
            <input
              required
              type="file"
              accept="image/*,.pdf"
              className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#12231d] file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
              onChange={(e) => update("idDocument", e.target.files?.[0] ?? null)}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Date of birth
              <input required type="date" className={inputClass} value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} />
            </label>
            <label className={labelClass}>
              County of residence
              <input required list="kenya-counties" className={inputClass} value={form.county} onChange={(e) => update("county", e.target.value)} placeholder="Start typing…" />
              <datalist id="kenya-counties">
                {KENYA_COUNTIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
          </div>

          <label className={labelClass}>
            Residential address
            <textarea required rows={2} className={inputClass} value={form.residentialAddress} onChange={(e) => update("residentialAddress", e.target.value)} placeholder="Street, building, estate" />
          </label>
        </section>

        {/* Payout */}
        <section className="space-y-5 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-[#12231d]">Payout details</h2>
          <fieldset className="space-y-2 text-sm text-[#12231d]">
            <legend className="font-medium">Payout method</legend>
            <label className="mr-5 inline-flex items-center gap-2">
              <input type="radio" checked={form.payoutMethod === "mpesa"} onChange={() => update("payoutMethod", "mpesa")} /> M-Pesa
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" checked={form.payoutMethod === "bank"} onChange={() => update("payoutMethod", "bank")} /> Bank transfer
            </label>
          </fieldset>
          {form.payoutMethod === "mpesa" ? (
            <label className={labelClass}>
              M-Pesa number
              <input type="tel" placeholder="0712345678" className={inputClass} value={form.mpesaNumber} onChange={(e) => update("mpesaNumber", e.target.value)} />
            </label>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>
                Bank name
                <input className={inputClass} value={form.bankName} onChange={(e) => update("bankName", e.target.value)} />
              </label>
              <label className={labelClass}>
                Account number
                <input className={inputClass} value={form.bankAccount} onChange={(e) => update("bankAccount", e.target.value)} />
              </label>
            </div>
          )}
        </section>

        {/* About & terms */}
        <section className="space-y-5 rounded-2xl bg-white p-6 shadow-sm">
          <label className={labelClass}>
            About you <span className="font-normal text-gray-500">(optional)</span>
            <textarea rows={4} className={inputClass} value={form.hostBio} onChange={(e) => update("hostBio", e.target.value)} />
          </label>

          <label className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-[#12231d]">
            <input
              type="checkbox"
              checked={form.agreedToHostTerms}
              onChange={(e) => update("agreedToHostTerms", e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-[#ec1561]"
              required
            />
            <span>
              I accept and agree to the{" "}
              <Link href="/host-listing-agreement-and-terms-of-service" target="_blank" className="font-semibold text-[#ec1561] underline">
                Host Listing Agreement and Terms of Service
              </Link>
              . I confirm that I am the legal owner or authorized manager of the properties I list, and that the
              identity information provided above is accurate.
            </span>
          </label>

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={submitting} className="w-full rounded-lg bg-[#12231d] px-4 py-3 font-medium text-white disabled:opacity-50">
            {submitting ? "Submitting…" : "Submit for review"}
          </button>
        </section>
      </form>
        </>
      )}
    </div>
  );
}
