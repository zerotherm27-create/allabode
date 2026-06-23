import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signedUrl, DOCUMENTS_BUCKET } from "@/lib/storage";

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

  if (!doc || !(doc as { file_path?: string }).file_path) {
    return new NextResponse("Not found", { status: 404 });
  }

  const url = await signedUrl(
    supabase,
    DOCUMENTS_BUCKET,
    (doc as { file_path: string }).file_path,
    120
  );
  if (!url) return new NextResponse("Unavailable", { status: 503 });
  return NextResponse.redirect(url);
}
