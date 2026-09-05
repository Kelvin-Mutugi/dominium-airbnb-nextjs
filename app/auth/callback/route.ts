import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/signup?error=missing_code`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/signup?error=auth_failed`);
  }

  // The profiles row already exists at this point — the on_auth_user_created
  // trigger creates it the moment Supabase inserts into auth.users, which
  // happens as part of the OAuth exchange above. Google doesn't provide
  // phone, so a first-time sign-in always needs to complete that step.
  const { data: profile } = await supabase
    .from("profiles")
    .select("phone")
    .eq("id", data.user.id)
    .single();

  if (!profile?.phone) {
    return NextResponse.redirect(`${origin}/complete-profile`);
  }

  return NextResponse.redirect(`${origin}/`);
}
