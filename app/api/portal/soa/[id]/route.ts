import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signedUrl, FINANCE_DOCS_BUCKET } from "@/lib/storage";

/**
 * Owner/tenant PDF download. RLS scopes the statement to published + belonging to
 * the signed-in user, so a stranger gets a 404 and never a signed URL.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { searchParams } = new URL(_req.url);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/portal/login", _req.url));

  const { data: stmt } = await supabase
    .from("statements_of_account")
    .select("pdf_path,status")
    .eq("id", id)
    .maybeSingle();

  if (!stmt || stmt.status !== "published" || !stmt.pdf_path) {
    return new NextResponse("Not found", { status: 404 });
  }

  const url = await signedUrl(supabase, FINANCE_DOCS_BUCKET, stmt.pdf_path, 120);
  if (!url) return new NextResponse("Unavailable", { status: 404 });
  const pdf = await fetch(url);
  if (!pdf.ok) return new NextResponse("Unavailable", { status: 404 });

  const filename = `soa-${id}.pdf`;
  const disposition = searchParams.get("download") === "1" ? "attachment" : "inline";
  return new NextResponse(await pdf.arrayBuffer(), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${filename}"`,
    },
  });
}
