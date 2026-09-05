"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";

export default function CompleteProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [phone, setPhone] = useState("");
  const [wantsToHost, setWantsToHost] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!/^0\d{9}$/.test(phone)) {
      setError("Enter a valid phone number, e.g. 0712345678.");
      return;
    }

    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Your session expired — please sign in again.");
      setSubmitting(false);
      return;
    }

    // role only ever moves guest -> host here; the database trigger
    // rejects any other transition even if this payload were tampered with.
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        phone,
        ...(wantsToHost ? { role: "host" } : {}),
      })
      .eq("id", user.id);

    setSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push(wantsToHost ? "/onboarding" : "/");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#12231d] px-6">
      <div className="w-full max-w-sm bg-[#f6f4ee] rounded-sm px-8 py-10">
        <h1 className="font-serif text-[26px] text-[#12231d] mb-2">
          Almost there
        </h1>
        <p className="text-[#4b5850] text-[15px] leading-relaxed mb-7">
          Just need a couple more details before you're set up.
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-[18px]">
          <label className="flex flex-col gap-1.5 text-[13px] text-[#4b5850]">
            <span>Phone number</span>
            <input
              type="tel"
              required
              placeholder="0712345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              className="text-[15px] px-3 py-2.5 rounded-[3px] border border-[#cfd3c9] bg-white text-[#12231d] focus:outline-none focus:ring-2 focus:ring-[#12231d] focus:ring-offset-1"
            />
          </label>

          <label className="flex flex-row items-center gap-2.5 text-sm text-[#4b5850]">
            <input
              type="checkbox"
              checked={wantsToHost}
              onChange={(e) => setWantsToHost(e.target.checked)}
              className="h-4 w-4 accent-[#12231d]"
            />
            <span>I want to list a property as a host</span>
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
            {submitting ? "Saving…" : "Continue"}
          </button>
        </form>
      </div>
    </main>
  );
}
