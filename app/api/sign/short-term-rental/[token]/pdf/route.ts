import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AGREEMENTS_BUCKET } from "@/lib/storage";

/**
 * Token-gated download for the fully-signed short term rental agreement PDF.
 * One route serves both parties: the token is tried as the tenant's
 * credential first, then as the homeowner's (each SECURITY DEFINER RPC only
 * matches its own token column). Only serves the file once status =
 * 'completed'.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  let { data: agreement } = await supabase.rpc("get_str_agreement_by_token", { p_token: token });
  if (!agreement) {
    ({ data: agreement } = await supabase.rpc("get_str_agreement_by_homeowner_token", { p_token: token }));
  }
  if (!agreement) return new NextResponse("Not found", { status: 404 });

  const record = agreement as { status: string; pdf_path: string | null };
  if (record.status !== "completed" || !record.pdf_path) {
    return new NextResponse("Not yet available", { status: 404 });
  }

  // Anonymous caller — generating a signed URL for a private bucket requires
  // the service-role client (no anon RLS policy exists on this bucket).
  const admin = createAdminClient();
  const { data: signed } = await admin.storage.from(AGREEMENTS_BUCKET).createSignedUrl(record.pdf_path, 120);
  if (!signed?.signedUrl) return new NextResponse("Unavailable", { status: 404 });

  const pdf = await fetch(signed.signedUrl);
  if (!pdf.ok) return new NextResponse("Unavailable", { status: 404 });

  return new NextResponse(await pdf.arrayBuffer(), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="short-term-rental-agreement.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
