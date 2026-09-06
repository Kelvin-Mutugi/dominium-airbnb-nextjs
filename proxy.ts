import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtectedRoute =
    pathname.startsWith("/host") ||
    pathname.startsWith("/complete-profile") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/admin");

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  // Prefer using a server-only service role key for server-side checks when available.
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  const acceptHeader = request.headers.get("accept") || "";
  const isApiRequest =
    acceptHeader.includes("application/json") ||
    pathname.startsWith("/api") ||
    request.headers.get("x-requested-with") === "XMLHttpRequest";

  if (error || !user) {
    if (isApiRequest) {
      return new NextResponse(JSON.stringify({ error: "unauthenticated" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    const loginUrl = new URL("/signin", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If this is an admin route, verify the user's `privilege` flag is true
  if (pathname.startsWith("/admin")) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("privilege")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile || profile.privilege !== true) {
      // Signed-in but not privileged — return 404 to hide admin route existence
      if (isApiRequest) {
        return new NextResponse(null, { status: 404 });
      }

      // For browser requests, rewrite to the 404 page so URL doesn't change.
      return NextResponse.rewrite(new URL("/404", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/host/:path*",
    "/complete-profile",
    "/account/:path*",
    "/admin/:path*",
  ],
};
