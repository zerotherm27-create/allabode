import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AGREEMENTS_BUCKET } from "@/lib/storage";

/**
 * Token-gated view of the *original* contract, for addenda that amend a
 * contract signed outside this system. Both parties are parties to that
 * document, so one route serves either token — tried tenant-side first, then
 * landlord-side, exactly like the signed-addendum download next door.
 *
 * Unlike that route this is available from `sent` onwards: a party being asked
 * to sign an amendment must be able to read what is being amended.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  let { data: addendum } = await supabase.rpc("get_addendum_by_token", { p_token: token });
  if (!addendum) {
    ({ data: addendum } = await supabase.rpc("get_addendum_by_landlord_token", { p_token: token }));
  }
  if (!addendum) return new NextResponse("Not found", { status: 404 });

  const record = addendum as { parent_document_path: string | null; parent_document_name: string | null };
  if (!record.parent_document_path) return new NextResponse("Not found", { status: 404 });

  // Anonymous caller — generating a signed URL for a private bucket requires
  // the service-role client (no anon RLS policy exists on this bucket).
  const admin = createAdminClient();
  const { data: signed } = await admin.storage
    .from(AGREEMENTS_BUCKET)
    .createSignedUrl(record.parent_document_path, 120);
  if (!signed?.signedUrl) return new NextResponse("Unavailable", { status: 404 });

  const file = await fetch(signed.signedUrl);
  if (!file.ok) return new NextResponse("Unavailable", { status: 404 });

  const name = (record.parent_document_name || "original-contract").replace(/["\\]/g, "");
  return new NextResponse(await file.arrayBuffer(), {
    headers: {
      "Content-Type": file.headers.get("content-type") ?? "application/pdf",
      "Content-Disposition": `inline; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
