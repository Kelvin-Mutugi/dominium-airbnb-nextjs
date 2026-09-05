"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/app/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleReset(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      },
    );

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage("A password reset link has been sent to your email.");
    setEmail("");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f3efe9] px-6 py-16">
      <div className="w-full max-w-md rounded-[18px] border border-[#ece8e2] bg-white p-8 shadow-[0_20px_50px_rgba(18,35,29,0.06)]">
        <p className="mb-3 text-center text-xs font-medium uppercase tracking-[0.2em] text-[#ec1561]">
          Account recovery
        </p>
        <h1 className="font-display text-[26px] text-[#12231d] mb-2 tracking-wide text-center">
          Reset your password
        </h1>
        <p className="text-[#4b5850] text-[15px] leading-relaxed mb-8 text-center">
          Enter the email associated with your account and we’ll send a reset
          link.
        </p>

        <form onSubmit={handleReset} noValidate className="space-y-[18px]">
          <label className="flex flex-col gap-1.5 text-[13px] text-[#4b5850]">
            <span>Email address</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="text-[15px] px-3 py-2.5 rounded-[3px] border border-[#cfd3c9] bg-white text-[#12231d] focus:outline-none focus:ring-2 focus:ring-[#12231d] focus:ring-offset-1"
            />
          </label>

          {error && (
            <p role="alert" className="text-[#a3352b] text-[13px]">
              {error}
            </p>
          )}

          {message && <p className="text-[#12231d] text-[13px]">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-[3px] bg-[#12231d] text-[#f6f4ee] text-[15px] disabled:opacity-60 disabled:cursor-default"
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <p className="text-[#4b5850] text-[13px] mt-8 text-center">
          Back to{" "}
          <Link
            href="/signin"
            className="font-medium text-[#12231d] no-underline hover:text-[#ec1561]"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
