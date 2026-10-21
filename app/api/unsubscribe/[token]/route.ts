import { NextResponse } from "next/server";
import { parseToken } from "@/lib/nurture/message";
import { unsubscribeByToken } from "@/lib/nurture/unsubscribe";

export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

/**
 * RFC 8058 one-click unsubscribe: mail providers POST
 * `List-Unsubscribe=One-Click` to the URL in the List-Unsubscribe header.
 * No login, no origin check (the request comes from the provider). The
 * response never says whether the token matched a lead.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!parseToken(token)) {
    return NextResponse.json({ ok: false }, { status: 400, headers: noStore });
  }
  const result = await unsubscribeByToken(token);
  if (result === "error") {
    return NextResponse.json({ ok: false }, { status: 503, headers: noStore });
  }
  return NextResponse.json({ ok: true }, { headers: noStore });
}

/** A GET (someone opening the header URL in a browser) never unsubscribes; it goes to the confirm page. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = parseToken(token);
  const target = new URL(t ? `/unsubscribe/${t}` : "/", req.url);
  return NextResponse.redirect(target, { status: 303, headers: noStore });
}
