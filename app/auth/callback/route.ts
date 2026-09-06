import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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
