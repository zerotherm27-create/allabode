import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Google's Drive API redirects `alt=media` downloads to a URL that doesn't
 *  carry CORS headers for arbitrary origins, so browsers block a direct
 *  fetch() to it. Proxying the download through our own server (which isn't
 *  subject to CORS) is Google's documented workaround. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { fileId, accessToken } = (await req.json()) as { fileId?: string; accessToken?: string };
  if (!fileId || !accessToken) return new NextResponse("Missing fileId or accessToken", { status: 400 });

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok || !res.body) {
    return new NextResponse("Could not download file from Google Drive.", { status: 502 });
  }

  return new NextResponse(res.body, {
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/octet-stream" },
  });
}
