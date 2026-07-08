import { NextResponse, type NextRequest } from "next/server";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
import { getOpenAI, isAiConfigured, RECEIPT_MODEL } from "@/lib/ai/client";
import { createClient } from "@/lib/supabase/server";
import { checkAndIncrement, rateLimitKeyFromRequest } from "@/lib/chat/rate-limit";
import { buildSystemPrompt } from "@/lib/chat/system-prompt";
import { getListing } from "@/lib/listings";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const maxDuration = 30;

type ChatMessage = { role: "user" | "assistant"; content: string };

const MAX_HISTORY_TURNS = 8;
const MAX_TOKENS = 500;

const TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_listing_details",
      description: "Fetch real, current details for a specific property listing by its slug.",
      parameters: {
        type: "object",
        properties: { slug: { type: "string", description: "The listing's URL slug" } },
        required: ["slug"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_nearby_places",
      description:
        "Fetch cached nearby amenities (schools, malls, markets, etc.) for a specific listing by its slug.",
      parameters: {
        type: "object",
        properties: { slug: { type: "string", description: "The listing's URL slug" } },
        required: ["slug"],
        additionalProperties: false,
      },
    },
  },
];

/**
 * Tool handlers always re-fetch from the DB server-side — the model never
 * gets to assert listing facts itself, only request them by slug.
 */
async function runTool(name: string, args: Record<string, unknown>): Promise<string> {
  const slug = typeof args.slug === "string" ? args.slug : "";
  if (!slug) return JSON.stringify({ error: "No slug provided." });

  const listing = await getListing(slug);
  if (!listing) return JSON.stringify({ error: "Listing not found." });

  if (name === "get_listing_details") {
    return JSON.stringify({
      title: listing.title,
      location: listing.location,
      price: listing.price,
      status: listing.status,
      propertyType: listing.propertyType,
      listingType: listing.listingType,
      bedrooms: listing.beds,
      bathrooms: listing.baths,
      floorArea: listing.area,
      lotArea: listing.lotArea,
      furnishing: listing.furnishing,
      parking: listing.parking,
      availability: listing.availabilityDate,
    });
  }
  if (name === "get_nearby_places") {
    return JSON.stringify({ places: listing.nearbyPlaces ?? [] });
  }
  return JSON.stringify({ error: "Unknown tool." });
}

export async function POST(req: NextRequest) {
  if (!isAiConfigured()) {
    return NextResponse.json({ error: "Chat is currently unavailable." }, { status: 503 });
  }

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
  const client = getOpenAI();
  const settings = await getSettings();

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: buildSystemPrompt(body.listingSlug, settings) },
    ...history.map((m): ChatCompletionMessageParam => ({ role: m.role, content: m.content })),
  ];

  // First pass: non-streaming, so tool calls (which arrive incrementally when
  // streamed) can be reliably captured and resolved before the final answer.
  const first = await client.chat.completions.create({
    model: RECEIPT_MODEL,
    messages,
    tools: TOOLS,
    max_tokens: MAX_TOKENS,
  });

  const toolCalls = first.choices[0]?.message?.tool_calls;
  if (toolCalls && toolCalls.length > 0) {
    messages.push({ role: "assistant", content: first.choices[0].message.content, tool_calls: toolCalls });
    for (const call of toolCalls) {
      if (call.type !== "function") continue;
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments);
      } catch {
        // malformed args — runTool below returns a "not found" style error
      }
      const result = await runTool(call.function.name, args);
      messages.push({ role: "tool", tool_call_id: call.id, content: result });
    }
  }

  const stream = await client.chat.completions.create({
    model: RECEIPT_MODEL,
    messages,
    max_tokens: MAX_TOKENS,
    stream: true,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content;
          if (text) controller.enqueue(encoder.encode(text));
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
