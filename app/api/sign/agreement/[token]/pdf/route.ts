import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AGREEMENTS_BUCKET } from "@/lib/storage";

/**
 * Token-gated download for the fully-signed agreement PDF. No auth required —
 * the token itself is the credential, validated server-side via the
 * SECURITY DEFINER RPC. Only serves the file once status = 'completed'.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: agreement, error } = await supabase.rpc("get_agreement_by_token", { p_token: token });
  if (error || !agreement) return new NextResponse("Not found", { status: 404 });

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
      "Content-Disposition": `attachment; filename="property-management-agreement.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
