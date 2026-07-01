import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signedUrl, DOCUMENTS_BUCKET, AGREEMENTS_BUCKET } from "@/lib/storage";

/**
 * Signed-URL delivery for portal documents. RLS on the `documents` table ensures
 * the querying user can only see documents they're entitled to view (tenant-visible
 * or owner-visible based on their role). A stranger gets a 404 and never a URL.
 *
 * Staff can download any document via this route as well (is_staff() RLS).
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/portal/login", _req.url));

  const { data: doc } = await supabase
    .from("documents")
    .select("file_path,file_name,file_mime_type")
    .eq("id", id)
    .maybeSingle();

  const filePath = (doc as { file_path?: string } | null)?.file_path;
  if (!filePath) {
    return new NextResponse("Not found", { status: 404 });
  }

  const url = await signedUrl(supabase, DOCUMENTS_BUCKET, filePath, 120);
  if (url) return NextResponse.redirect(url);

  // Agreements completed before the documents-bucket copy fix (see
  // completeAgreement() in app/admin/agreement-actions.ts) still point at
  // the agreements bucket, which is staff-only via RLS — a plain owner/tenant
  // session can't sign a URL there. The `documents` table RLS check above
  // already proved this user is entitled to see this row, so it's safe to
  // fall back to the admin client for just the signed-URL step.
  const fallbackUrl = await signedUrl(createAdminClient(), AGREEMENTS_BUCKET, filePath, 120);
  if (!fallbackUrl) return new NextResponse("Unavailable", { status: 503 });
  return NextResponse.redirect(fallbackUrl);
}
