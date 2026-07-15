import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signedUrl, buildOwnerSoaFilename, FINANCE_DOCS_BUCKET } from "@/lib/storage";

/**
 * Owner/tenant PDF preview/download. RLS scopes the statement to published + belonging to
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
    .select("pdf_path,status,owner_id,unit_id,period_start")
    .eq("id", id)
    .maybeSingle();

  if (!stmt || stmt.status !== "published" || !stmt.pdf_path) {
    return new NextResponse("Not found", { status: 404 });
  }

  const url = await signedUrl(supabase, FINANCE_DOCS_BUCKET, stmt.pdf_path, 120);
  if (!url) return new NextResponse("Unavailable", { status: 404 });
  const pdf = await fetch(url);
  if (!pdf.ok) return new NextResponse("Unavailable", { status: 404 });

  const { data: ownerRow } = stmt.owner_id
    ? await supabase.from("owners").select("name").eq("id", stmt.owner_id).maybeSingle()
    : { data: null };
  const { data: unitRow } = stmt.unit_id
    ? await supabase.from("units").select("unit_label,properties(name)").eq("id", stmt.unit_id).maybeSingle()
    : { data: null };
  const property = (unitRow as { properties?: { name?: string } | { name?: string }[] | null } | null)?.properties;

  const filename = buildOwnerSoaFilename({
    ownerName:    (ownerRow as { name?: string } | null)?.name ?? "Owner",
    unitLabel:    (unitRow as { unit_label?: string } | null)?.unit_label ?? null,
    propertyName: (Array.isArray(property) ? property[0]?.name : property?.name) ?? null,
    periodStart:  stmt.period_start,
  });
  const disposition = searchParams.get("download") === "1" ? "attachment" : "inline";
  return new NextResponse(await pdf.arrayBuffer(), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
