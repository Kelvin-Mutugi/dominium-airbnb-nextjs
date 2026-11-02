"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { submitHostApplicationForUser } from "@/app/admin/verification/actions";

const COUNTIES = [
  "Mombasa", "Kwale", "Kilifi", "Tana River", "Lamu", "Taita-Taveta", "Garissa", "Wajir",
  "Mandera", "Marsabit", "Isiolo", "Meru", "Tharaka-Nithi", "Embu", "Kitui", "Machakos",
  "Makueni", "Nyandarua", "Nyeri", "Kirinyaga", "Murang'a", "Kiambu", "Turkana", "West Pokot",
  "Samburu", "Trans Nzoia", "Uasin Gishu", "Elgeyo-Marakwet", "Nandi", "Baringo", "Laikipia",
  "Nakuru", "Narok", "Kajiado", "Kericho", "Bomet", "Kakamega", "Vihiga", "Bungoma", "Busia",
  "Siaya", "Kisumu", "Homa Bay", "Migori", "Kisii", "Nyamira", "Nairobi",
];

const inputClass = "mt-1.5 w-full rounded-lg border border-[#D9D5CF] bg-white px-3 py-2.5 text-sm text-[#1B1A2E] shadow-sm placeholder:text-gray-400 focus:border-[#E23E85] focus:outline-none focus:ring-2 focus:ring-[#E23E85]/20";
const labelClass = "block text-sm font-medium text-[#1B1A2E]";

type ExistingUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string;
};

export function HostApplicationForm({ existingUser }: { existingUser?: ExistingUser }) {
  const router = useRouter();
  const [hostType, setHostType] = useState<"individual" | "company">("individual");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        const invited = await submitHostApplicationForUser(formData);
        router.push(`/admin/verification?status=pending&submitted=${invited ? "invited" : "existing"}`);
        router.refresh();
      } catch (submissionError) {
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : "Unable to submit the host application.",
        );
      }
    });
  }

  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <Link href="/admin/verification" className="text-sm font-medium text-[#6B6A78] hover:text-[#E23E85]">
          ← Back to Host Verification
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-[#1B1A2E]">Enter host details</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">
          Enter details for a guest becoming a host, or invite a new host. Every application stays pending until another administrator reviews it.
        </p>
      </header>

      <form onSubmit={submit} className="space-y-5">
        <section className="rounded-xl border border-[#E9E6DD] bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-semibold text-[#1B1A2E]">Account</h2>
          <input type="hidden" name="accountType" value={existingUser ? "existing" : "new"} />
          {existingUser ? (
            <>
              <input type="hidden" name="existingUserId" value={existingUser.id} />
              <p className="mt-1 text-sm text-gray-500">This guest account will become a host account after you submit their application.</p>
              <dl className="mt-4 grid gap-3 rounded-lg bg-[#F7F5F2] p-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-gray-500">Selected user</dt>
                  <dd className="mt-1 font-medium text-[#1B1A2E]">{existingUser.fullName || "Name not set"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Account email</dt>
                  <dd className="mt-1 break-all font-medium text-[#1B1A2E]">{existingUser.email || "No email on account"}</dd>
                </div>
              </dl>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-gray-500">We&apos;ll email an invitation so this new host can activate their account.</p>
              <label className={`${labelClass} mt-4 block max-w-xl`}>
                Email for the host invitation
                <input required type="email" name="accountEmail" className={inputClass} autoComplete="email" />
              </label>
            </>
          )}
        </section>

        <section className="space-y-4 rounded-xl border border-[#E9E6DD] bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h2 className="text-base font-semibold text-[#1B1A2E]">Host details</h2>
            <p className="mt-1 text-sm text-gray-500">Enter the details provided by the host.</p>
          </div>
          <label className={labelClass}>
            Full legal name
            <input required name="fullName" minLength={2} maxLength={120} defaultValue={existingUser?.fullName ?? ""} autoComplete="name" className={inputClass} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Phone number
              <input required name="phone" type="tel" inputMode="tel" placeholder="0712345678" defaultValue={existingUser?.phone ?? ""} autoComplete="tel" className={inputClass} />
            </label>
            <label className={labelClass}>
              Alternate phone <span className="font-normal text-gray-500">(optional)</span>
              <input name="alternatePhone" type="tel" inputMode="tel" placeholder="0712345678" className={inputClass} />
            </label>
          </div>
          <label className={labelClass}>
            Host contact email
            <input required name="email" type="email" defaultValue={existingUser?.email ?? ""} autoComplete="email" className={inputClass} />
          </label>
          <fieldset>
            <legend className="text-sm font-medium text-[#1B1A2E]">Host type</legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {(["individual", "company"] as const).map((type) => (
                <label key={type} className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="hostType"
                    value={type}
                    checked={hostType === type}
                    onChange={() => setHostType(type)}
                    className="accent-[#E23E85]"
                  />
                  {type === "individual" ? "Individual" : "Company"}
                </label>
              ))}
            </div>
          </fieldset>
          {hostType === "company" && (
            <label className={labelClass}>
              Company / business name
              <input required name="businessName" maxLength={160} autoComplete="organization" className={inputClass} />
            </label>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Date of birth
              <input required name="dateOfBirth" type="date" className={inputClass} />
            </label>
            <label className={labelClass}>
              County of residence
              <select required name="county" defaultValue="" className={inputClass}>
                <option value="" disabled>Select county</option>
                {COUNTIES.map((county) => <option key={county} value={county}>{county}</option>)}
              </select>
            </label>
          </div>
          <label className={labelClass}>
            Residential address
            <textarea required name="residentialAddress" rows={2} maxLength={500} placeholder="Street, building, estate" className={inputClass} />
          </label>
        </section>

        <section className="space-y-4 rounded-xl border border-[#E9E6DD] bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h2 className="text-base font-semibold text-[#1B1A2E]">Payout & confirmation</h2>
            <p className="mt-1 text-sm text-gray-500">Host payouts are sent to a Safaricom M-Pesa number.</p>
          </div>
          <label className={labelClass}>
            M-Pesa number
            <input required name="mpesaNumber" type="tel" inputMode="tel" placeholder="0712345678" autoComplete="tel" className={inputClass} />
          </label>
          <label className={labelClass}>
            About the host <span className="font-normal text-gray-500">(optional)</span>
            <textarea name="hostBio" rows={3} maxLength={2000} className={inputClass} />
          </label>
          <div className="space-y-3 rounded-lg border border-[#E9E6DD] bg-[#F7F5F2] p-4 text-sm leading-6 text-[#3A3856]">
            <label className="flex items-start gap-3">
              <input required type="checkbox" name="hostAuthorized" value="true" className="mt-1 h-4 w-4 shrink-0 accent-[#E23E85]" />
              <span>The host authorized me to enter and submit these details on their behalf.</span>
            </label>
            <label className="flex items-start gap-3">
              <input required type="checkbox" name="agreedToHostTerms" value="true" className="mt-1 h-4 w-4 shrink-0 accent-[#E23E85]" />
              <span>
                The host has confirmed acceptance of the{" "}
                <Link href="/host-listing-agreement-and-terms-of-service" target="_blank" className="font-semibold text-[#9C2454] underline">
                  Host Listing Agreement and Terms of Service
                </Link>.
              </span>
            </label>
          </div>
          <p className="text-xs leading-5 text-gray-500">
            This submission will be marked pending. It does not approve or verify the host.
          </p>
          {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
          <button type="submit" disabled={isPending} className="rounded-lg bg-[#E23E85] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#c93075] disabled:cursor-wait disabled:opacity-60">
            {isPending ? "Submitting application…" : "Submit for review"}
          </button>
        </section>
      </form>
    </div>
  );
}
