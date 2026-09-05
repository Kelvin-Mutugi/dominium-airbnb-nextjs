"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";

type FormState = {
  businessName: string;
  idNumber: string;
  payoutMethod: "mpesa" | "bank";
  mpesaNumber: string;
  bankName: string;
  bankAccount: string;
  hostBio: string;
};

const initialState: FormState = {
  businessName: "",
  idNumber: "",
  payoutMethod: "mpesa",
  mpesaNumber: "",
  bankName: "",
  bankAccount: "",
  hostBio: "",
};

export default function HostOnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.idNumber.trim()) {
      setError("ID number is required for host verification.");
      return;
    }
    if (form.payoutMethod === "mpesa" && !/^0\d{9}$/.test(form.mpesaNumber)) {
      setError("Enter a valid M-Pesa number, e.g. 0712345678.");
      return;
    }
    if (form.payoutMethod === "bank" && (!form.bankName || !form.bankAccount)) {
      setError("Bank name and account number are both required.");
      return;
    }

    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You need to be signed in to complete host onboarding.");
      setSubmitting(false);
      return;
    }

    const payoutDetails =
      form.payoutMethod === "mpesa"
        ? { number: form.mpesaNumber }
        : { bank: form.bankName, account: form.bankAccount };

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        business_name: form.businessName || null,
        id_number: form.idNumber,
        payout_method: form.payoutMethod,
        payout_details: payoutDetails,
        host_bio: form.hostBio || null,
      })
      .eq("id", user.id);

    setSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push("/host/pending-review");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#12231d] px-6 py-12">
      <div className="w-full max-w-md bg-[#f6f4ee] rounded-sm px-8 py-10">
        <h1 className="font-serif text-[28px] text-[#12231d] mb-2">
          Set up your host account
        </h1>
        <p className="text-[#4b5850] text-[15px] leading-relaxed mb-7">
          This info is used to verify you and to pay you out after each stay. An
          admin reviews new hosts before listings go live.
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-[18px]">
          <label className="flex flex-col gap-1.5 text-[13px] text-[#4b5850]">
            <span>Business name (optional)</span>
            <input
              type="text"
              value={form.businessName}
              onChange={(e) => update("businessName", e.target.value)}
              className="text-[15px] px-3 py-2.5 rounded-[3px] border border-[#cfd3c9] bg-white text-[#12231d] focus:outline-none focus:ring-2 focus:ring-[#12231d] focus:ring-offset-1"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-[13px] text-[#4b5850]">
            <span>National ID number</span>
            <input
              type="text"
              required
              value={form.idNumber}
              onChange={(e) => update("idNumber", e.target.value)}
              className="text-[15px] px-3 py-2.5 rounded-[3px] border border-[#cfd3c9] bg-white text-[#12231d] focus:outline-none focus:ring-2 focus:ring-[#12231d] focus:ring-offset-1"
            />
          </label>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-[13px] text-[#4b5850] mb-1">
              How should we pay you out?
            </legend>
            <label className="flex items-center gap-2.5 text-sm text-[#4b5850]">
              <input
                type="radio"
                name="payoutMethod"
                checked={form.payoutMethod === "mpesa"}
                onChange={() => update("payoutMethod", "mpesa")}
                className="accent-[#12231d]"
              />
              M-Pesa
            </label>
            <label className="flex items-center gap-2.5 text-sm text-[#4b5850]">
              <input
                type="radio"
                name="payoutMethod"
                checked={form.payoutMethod === "bank"}
                onChange={() => update("payoutMethod", "bank")}
                className="accent-[#12231d]"
              />
              Bank transfer
            </label>
          </fieldset>

          {form.payoutMethod === "mpesa" ? (
            <label className="flex flex-col gap-1.5 text-[13px] text-[#4b5850]">
              <span>M-Pesa number</span>
              <input
                type="tel"
                placeholder="0712345678"
                value={form.mpesaNumber}
                onChange={(e) => update("mpesaNumber", e.target.value)}
                className="text-[15px] px-3 py-2.5 rounded-[3px] border border-[#cfd3c9] bg-white text-[#12231d] focus:outline-none focus:ring-2 focus:ring-[#12231d] focus:ring-offset-1"
              />
            </label>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-[13px] text-[#4b5850]">
                <span>Bank name</span>
                <input
                  type="text"
                  value={form.bankName}
                  onChange={(e) => update("bankName", e.target.value)}
                  className="text-[15px] px-3 py-2.5 rounded-[3px] border border-[#cfd3c9] bg-white text-[#12231d] focus:outline-none focus:ring-2 focus:ring-[#12231d] focus:ring-offset-1"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-[13px] text-[#4b5850]">
                <span>Account number</span>
                <input
                  type="text"
                  value={form.bankAccount}
                  onChange={(e) => update("bankAccount", e.target.value)}
                  className="text-[15px] px-3 py-2.5 rounded-[3px] border border-[#cfd3c9] bg-white text-[#12231d] focus:outline-none focus:ring-2 focus:ring-[#12231d] focus:ring-offset-1"
                />
              </label>
            </div>
          )}

          <label className="flex flex-col gap-1.5 text-[13px] text-[#4b5850]">
            <span>About you (shown on your listings)</span>
            <textarea
              rows={3}
              value={form.hostBio}
              onChange={(e) => update("hostBio", e.target.value)}
              className="text-[15px] px-3 py-2.5 rounded-[3px] border border-[#cfd3c9] bg-white text-[#12231d] focus:outline-none focus:ring-2 focus:ring-[#12231d] focus:ring-offset-1 resize-none"
            />
          </label>

          {error && (
            <p role="alert" className="text-[#a3352b] text-[13px] -mt-1.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-[3px] bg-[#12231d] text-[#f6f4ee] text-[15px] disabled:opacity-60 disabled:cursor-default"
          >
            {submitting ? "Submitting…" : "Submit for review"}
          </button>
        </form>
      </div>
    </main>
  );
}
