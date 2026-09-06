import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

function getSafeRedirectPath(value: string | null) {
  if (!value) return "/";
  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("//")
  ) {
    return "/";
  }
  return value.startsWith("/") ? value : "/";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = getSafeRedirectPath(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(
      `${origin}/signin?redirectTo=${encodeURIComponent(next)}`,
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(
      `${origin}/signin?redirectTo=${encodeURIComponent(next)}`,
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("phone")
    .eq("id", data.user.id)
    .single();

  if (!profile?.phone) {
    return NextResponse.redirect(`${origin}/complete-profile`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
