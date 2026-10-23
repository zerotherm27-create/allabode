import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AGREEMENTS_BUCKET } from "@/lib/storage";

/**
 * Token-gated download for the fully-signed Authority to Sell. The token is the
 * credential, validated by the SECURITY DEFINER RPC; only served once completed.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_ats_by_token", { p_token: token });
  if (error || !data) return new NextResponse("Not found", { status: 404 });

  const record = data as { status: string; pdf_path: string | null };
  if (record.status !== "completed" || !record.pdf_path) {
    return new NextResponse("Not yet available", { status: 404 });
  }

  const admin = createAdminClient();
  const { data: signed } = await admin.storage.from(AGREEMENTS_BUCKET).createSignedUrl(record.pdf_path, 120);
  if (!signed?.signedUrl) return new NextResponse("Unavailable", { status: 404 });

  const pdf = await fetch(signed.signedUrl);
  if (!pdf.ok) return new NextResponse("Unavailable", { status: 404 });

  return new NextResponse(await pdf.arrayBuffer(), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="authority-to-sell.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
