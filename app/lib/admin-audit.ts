import "server-only";

import { getSupabaseAdmin } from "@/app/lib/supabase/admin";

export type AdminAuditEntity =
  | "listing"
  | "booking"
  | "user"
  | "host_verification"
  | "support_case"
  | "review"
  | "payout";

type AdminAuditEvent = {
  actorId: string;
  action: string;
  entityType: AdminAuditEntity;
  entityId: string;
  summary: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
};

export async function recordAdminAuditEvent(event: AdminAuditEvent) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("admin_audit_logs").insert({
    actor_id: event.actorId,
    action: event.action,
    entity_type: event.entityType,
    entity_id: event.entityId,
    summary: event.summary,
    before_data: event.before ?? null,
    after_data: event.after ?? null,
  });

  if (error) {
    console.error("Failed to write admin audit event:", error);
    throw new Error(
      "The change was made, but its audit record could not be saved. Contact support before retrying.",
    );
  }
}
