// app/admin/users/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/app/lib/admin-auth";
import { recordAdminAuditEvent } from "@/app/lib/admin-audit";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";

//suspend user
export async function suspendUser(userId: string, reason: string) {
  const actor = await requireAdmin();
  const normalizedReason = reason.trim();
  if (normalizedReason.length < 5 || normalizedReason.length > 1000) {
    throw new Error("Provide a suspension reason between 5 and 1000 characters.");
  }
  const admin = getSupabaseAdmin();
  const { data: previous, error: lookupError } = await admin
    .from("profiles")
    .select("status")
    .eq("id", userId)
    .maybeSingle();
  if (lookupError || !previous) throw new Error("User not found.");
  if (previous.status !== "active") throw new Error("Only active accounts can be suspended.");

  const { data, error } = await admin
    .from("profiles")
    .update({ status: "suspended", suspended_reason: normalizedReason })
    .eq("id", userId)
    .eq("status", previous.status)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Account status changed. Refresh and try again.");
  await recordAdminAuditEvent({
    actorId: actor.id,
    action: "user.suspended",
    entityType: "user",
    entityId: userId,
    summary: "Suspended user account.",
    before: { status: previous.status },
    after: { status: "suspended" },
  });
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}

// reactivate user
export async function reactivateUser(userId: string) {
  const actor = await requireAdmin();
  const admin = getSupabaseAdmin();
  const { data: previous, error: lookupError } = await admin
    .from("profiles")
    .select("status")
    .eq("id", userId)
    .maybeSingle();
  if (lookupError || !previous) throw new Error("User not found.");
  if (previous.status !== "suspended") throw new Error("Only suspended accounts can be reactivated.");

  const { data, error } = await admin
    .from("profiles")
    .update({ status: "active", suspended_reason: null })
    .eq("id", userId)
    .eq("status", previous.status)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Account status changed. Refresh and try again.");
  await recordAdminAuditEvent({
    actorId: actor.id,
    action: "user.reactivated",
    entityType: "user",
    entityId: userId,
    summary: "Reactivated user account.",
    before: { status: previous.status },
    after: { status: "active" },
  });
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}
