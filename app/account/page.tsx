"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";
import { createClient } from "@/app/lib/supabase/client";

export default function AccountPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userName, setUserName] = useState("User");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    async function loadAccount() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/signin");
        return;
      }

      const fullName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "User";

      setUserName(fullName);
      setEmail(user.email || "");
      setAvatarUrl(
        user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      );
    }

    void loadAccount();
  }, [router, supabase]);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/");
  }

  const initials =
    userName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "U";

  return (
    <main className="min-h-screen bg-[#f3efe9] px-6 py-16 font-sans">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-sm font-medium text-[#12231d] hover:text-[#ec1561]"
          >
            ← Back to website
          </Link>
        </div>

        <div className="grid gap-8 rounded-[24px] border border-[#ece8e2] bg-white p-6 shadow-[0_20px_50px_rgba(18,35,29,0.06)] md:grid-cols-[1.2fr_0.8fr] md:p-8">
          <section className="space-y-6">
            <div className="flex items-center gap-5">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-[#dfe5df] bg-[#f7f5f2] text-2xl font-semibold text-[#12231d]">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={userName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#ec1561]">
                  My account
                </p>
                <h1 className="font-display text-[30px] leading-none text-[#12231d]">
                  {userName}
                </h1>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[18px] border border-[#ece8e2] bg-[#f7f5f2] p-4">
                <div className="mb-2 flex items-center gap-2 text-[#12231d]">
                  <Mail size={16} />
                  <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                    Email
                  </span>
                </div>
                <p className="text-sm text-[#4b5850]">
                  {email || "No email available"}
                </p>
              </div>

              <div className="rounded-[18px] border border-[#ece8e2] bg-[#f7f5f2] p-4">
                <div className="mb-2 flex items-center gap-2 text-[#12231d]">
                  <ShieldCheck size={16} />
                  <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                    Account status
                  </span>
                </div>
                <p className="text-sm text-[#4b5850]">Verified member</p>
              </div>
            </div>

            <div className="rounded-[18px] border border-[#ece8e2] bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#12231d]">
                Quick actions
              </h2>

              <div className="space-y-3">
                <Link
                  href="/"
                  className="flex items-center justify-between rounded-[12px] border border-[#ece8e2] bg-[#f7f5f2] px-4 py-3 text-sm font-medium text-[#12231d] transition-colors hover:border-[#dfe5df] hover:bg-[#f1efe9]"
                >
                  <span className="flex items-center gap-3">
                    <UserRound size={16} />
                    View website
                  </span>
                  <span>→</span>
                </Link>

                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="flex w-full items-center justify-between rounded-[12px] border border-[#f3d7df] bg-[#fff7f9] px-4 py-3 text-sm font-medium text-[#4d1d2c] transition-colors hover:bg-[#fdeef3] disabled:opacity-60"
                >
                  <span className="flex items-center gap-3">
                    <LogOut size={16} />
                    {signingOut ? "Signing out…" : "Sign out"}
                  </span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </section>

          <aside className="rounded-[22px] bg-[#12231d] p-5 text-white">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-[#d7d9d3]">
              Access
            </p>
            <h2 className="font-display text-[26px] leading-tight text-white">
              Your stay, your plans, all in one place.
            </h2>
            <ul className="mt-6 space-y-3 text-sm text-[#e7eae5]">
              <li>• Manage bookings and saved stays</li>
              <li>• Continue hosting with a secure profile</li>
              <li>• Keep your account details protected</li>
            </ul>
          </aside>
        </div>
      </div>
    </main>
  );
}
