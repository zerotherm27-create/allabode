import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAndIncrement, rateLimitKeyFromRequest } from "@/lib/chat/rate-limit";
import { buildKnowledgeBase } from "@/lib/chat/knowledge-base";
import { looksSearchLike, routeMessage, type ChatMessage } from "@/lib/chat/intents";
import { getListing, getListings } from "@/lib/listings";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";

const MAX_HISTORY_TURNS = 8;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const allowed = await checkAndIncrement(supabase, rateLimitKeyFromRequest(req));
  if (!allowed) {
    return NextResponse.json(
      { error: "You're sending messages too quickly — please wait a bit and try again." },
      { status: 429 }
    );
  }

  const body = (await req.json().catch(() => null)) as
    | { messages?: ChatMessage[]; listingSlug?: string }
    | null;
  if (!body || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const history = body.messages.slice(-MAX_HISTORY_TURNS);
  const lastUserMessage = [...history].reverse().find((m) => m.role === "user")?.content ?? "";

  const [settings, listing, allListings] = await Promise.all([
    getSettings(),
    body.listingSlug ? getListing(body.listingSlug) : Promise.resolve(null),
    looksSearchLike(lastUserMessage) ? getListings() : Promise.resolve([]),
  ]);

  const reply = routeMessage({
    message: lastUserMessage,
    listingSlug: body.listingSlug,
    listing,
    allListings,
    kb: buildKnowledgeBase(settings),
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(reply));
      controller.close();
    },
  });

  return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
