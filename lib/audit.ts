import type { SupabaseClient } from "@supabase/supabase-js";

/** Append an immutable audit-log entry (spec §17.3). Best-effort: never throws. */
export async function logAudit(
  supabase: SupabaseClient,
  opts: {
    action: string;
    entityType?: string;
    entityId?: string | null;
    actorId?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  try {
    await supabase.from("audit_log").insert({
      actor_user_id: opts.actorId ?? null,
      action: opts.action,
      entity_type: opts.entityType ?? null,
      entity_id: opts.entityId ?? null,
      metadata: opts.metadata ?? {},
    });
  } catch {
    // Auditing must not break the primary action; swallow.
  }
}
