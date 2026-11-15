import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowedPushEndpoint } from "@/lib/push/endpoint";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 4_000;

async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  const raw = await req.text().catch(() => "");
  if (!raw || raw.length > MAX_BODY_BYTES) return null;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Save the push subscription of the current device for the signed-in user.
 * Uses the user's own session (RLS: user_id = auth.uid()), so it can never
 * touch another user's row. The endpoint must be a known browser push service.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await readJson(req);
  const keys = body?.keys as { p256dh?: unknown; auth?: unknown } | undefined;
  if (
    !body ||
    !isAllowedPushEndpoint(body.endpoint) ||
    typeof keys?.p256dh !== "string" ||
    typeof keys?.auth !== "string"
  ) {
    return NextResponse.json({ error: "Invalid subscription." }, { status: 400 });
  }

  // Replace this user's own row for the endpoint (idempotent re-subscribe).
  await supabase.from("push_subscriptions").delete().eq("endpoint", body.endpoint).eq("user_id", user.id);
  const { error } = await supabase.from("push_subscriptions").insert({
    user_id: user.id,
    endpoint: body.endpoint,
    p256dh: keys.p256dh.slice(0, 200),
    auth: keys.auth.slice(0, 100),
    user_agent: (req.headers.get("user-agent") ?? "").slice(0, 300),
  });
  if (error) {
    // 23505: the same device is registered to another account. The client re-subscribes with a fresh endpoint.
    if (error.code === "23505") {
      return NextResponse.json({ error: "This device is registered to another account." }, { status: 409 });
    }
    console.error("[push:subscribe]", error.message);
    return NextResponse.json({ error: "Could not save. Has the lead-alerts migration been run?" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** Remove this device's subscription (own rows only). */
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const body = await readJson(req);
  if (!body || !isAllowedPushEndpoint(body.endpoint)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  await supabase.from("push_subscriptions").delete().eq("endpoint", body.endpoint).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
