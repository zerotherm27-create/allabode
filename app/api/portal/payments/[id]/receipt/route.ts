import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signedUrl, FINANCE_DOCS_BUCKET } from "@/lib/storage";

/**
 * Signed-URL delivery for a tenant's own acknowledgement receipt. RLS on the
 * `payments` table (owner/tenant scoped read-only) proves the querying user is
 * entitled to this row; the `finance-docs` bucket is staff-only via RLS, so the
 * signed-URL step itself runs on the admin client — same narrow exception used
 * by /api/portal/documents/[id].
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/portal/login", _req.url));

  const { data: payment } = await supabase
    .from("payments")
    .select("receipt_pdf_path")
    .eq("id", id)
    .maybeSingle();

  const filePath = (payment as { receipt_pdf_path?: string | null } | null)?.receipt_pdf_path;
  if (!filePath) return new NextResponse("Not found", { status: 404 });

  const url = await signedUrl(createAdminClient(), FINANCE_DOCS_BUCKET, filePath, 120);
  if (!url) return new NextResponse("Unavailable", { status: 503 });
  return NextResponse.redirect(url);
}
