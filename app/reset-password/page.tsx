"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/app/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push("/signin");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f3efe9] px-6 py-16">
      <div className="w-full max-w-md rounded-[18px] border border-[#ece8e2] bg-white p-8 shadow-[0_20px_50px_rgba(18,35,29,0.06)]">
        <p className="mb-3 text-center text-xs font-medium uppercase tracking-[0.2em] text-[#ec1561]">
          Secure access
        </p>
        <h1 className="font-display text-[26px] text-[#12231d] mb-2 tracking-wide text-center">
          Set a new password
        </h1>
        <p className="text-[#4b5850] text-[15px] leading-relaxed mb-8 text-center">
          Choose a strong password to keep your account protected.
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-[18px]">
          <label className="flex flex-col gap-1.5 text-[13px] text-[#4b5850]">
            <span>New password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="text-[15px] px-3 py-2.5 rounded-[3px] border border-[#cfd3c9] bg-white text-[#12231d] focus:outline-none focus:ring-2 focus:ring-[#12231d] focus:ring-offset-1"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-[13px] text-[#4b5850]">
            <span>Confirm password</span>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
              className="text-[15px] px-3 py-2.5 rounded-[3px] border border-[#cfd3c9] bg-white text-[#12231d] focus:outline-none focus:ring-2 focus:ring-[#12231d] focus:ring-offset-1"
            />
          </label>

          {error && (
            <p role="alert" className="text-[#a3352b] text-[13px]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-[3px] bg-[#12231d] text-[#f6f4ee] text-[15px] disabled:opacity-60 disabled:cursor-default"
          >
            {loading ? "Updating…" : "Update password"}
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
