import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date().toISOString();

  if (!user) {
    // Log unauthenticated attempt (console stub)
    console.warn(`[admin-audit] unauthenticated access attempt at ${now}`);
    // Return 404 to hide admin endpoint existence
    return new NextResponse(null, { status: 404 });
  }

  const { data: profile } = await supabase
    .from("admin_roles")
    .select("privilege")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile || profile.privilege !== true) {
    // Log forbidden attempt
    console.warn(`[admin-audit] forbidden access by user=${user.id} at ${now}`);

    // Attempt to insert audit log into `admin_access_logs` table (best-effort)
    try {
      await supabase.from("admin_access_logs").insert([
        {
          user_id: user.id,
          action: "GET /api/admin/stats",
          success: false,
          created_at: now,
        },
      ]);
    } catch (e) {
      // ignore insertion errors
    }

    // Return 404 to hide admin endpoint existence
    return new NextResponse(null, { status: 404 });
  }

  // At this point the user is privileged — perform admin action (example data)
  // Example: count number of profiles (requires service role or appropriate RLS)
  const { data: countData } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: false });

  // Log successful access
  try {
    await supabase.from("admin_access_logs").insert([
      {
        user_id: user.id,
        action: "GET /api/admin/stats",
        success: true,
        created_at: now,
      },
    ]);
  } catch (e) {
    // ignore
  }

  return NextResponse.json({
    ok: true,
    profilesCount: Array.isArray(countData) ? countData.length : null,
  });
}
