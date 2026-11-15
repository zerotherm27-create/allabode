import { NextResponse, type NextRequest } from "next/server";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
import { getOpenAI, isAiConfigured, RECEIPT_MODEL } from "@/lib/ai/client";
import { createClient } from "@/lib/supabase/server";
import { checkChatLimits, rateLimitKeyFromRequest } from "@/lib/chat/rate-limit";
import { buildSystemPrompt } from "@/lib/chat/system-prompt";
import { getListing, getListings } from "@/lib/listings";
import {
  MAX_BODY_BYTES,
  MAX_TOOL_CALLS,
  cleanArg,
  cleanBedrooms,
  safeListingSlug,
  sanitizeMessages,
} from "@/lib/chat/guardrails";
import { encodeCards, encodeContact, searchListings, toCard, type ContactRequest, type ListingCard } from "@/lib/chat/listing-cards";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_TOKENS = 350;

const TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "request_contact_form",
      description:
        "Show the visitor a secure contact form inside the chat so an All Abode property specialist can follow up. Use when they want a viewing, a callback, pricing/availability confirmation, or to talk to someone. The form collects their details; you must never ask for them in chat.",
      parameters: {
        type: "object",
        properties: {
          slug: { type: "string", description: "Slug of the listing they are interested in, if any" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_listings",
      description:
        "Search current available property listings. Use when the visitor wants to find or browse properties. All fields optional. Returns up to 4 matches; preview cards are shown to the visitor automatically.",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string", description: "City, area or building, e.g. Makati" },
          market: { type: "string", enum: ["sale", "rent"] },
          propertyType: { type: "string", description: "e.g. condo, house, office, commercial" },
          bedrooms: { type: "integer", description: "Exact number of bedrooms" },
        },
        additionalProperties: false,
      },
    },
  },
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
type ToolResult = { content: string; cards?: ListingCard[]; contact?: ContactRequest };

async function runTool(
  name: string,
  args: Record<string, unknown>,
  pageSlug?: string
): Promise<ToolResult> {
  if (name === "request_contact_form") {
    const slug = safeListingSlug(args.slug) ?? pageSlug;
    const listing = slug ? await getListing(slug) : null;
    return {
      contact: listing ? { listing: listing.title, listingId: listing.dbId } : {},
      content: JSON.stringify({
        shown: true,
        note: "The contact form is now displayed to the visitor. Invite them to fill it in. Do not ask for their details in chat.",
      }),
    };
  }

  if (name === "search_listings") {
    const market = args.market === "sale" || args.market === "rent" ? args.market : undefined;
    const found = searchListings(await getListings(), {
      location: cleanArg(args.location),
      propertyType: cleanArg(args.propertyType),
      bedrooms: cleanBedrooms(args.bedrooms),
      market,
    });
    const cards = found.map(toCard);
    return {
      cards,
      content: JSON.stringify({
        count: cards.length,
        results: cards.map((c) => ({
          slug: c.slug,
          title: c.title,
          location: c.location,
          price: c.price,
          beds: c.beds,
          baths: c.baths,
        })),
      }),
    };
  }

  const slug = safeListingSlug(args.slug) ?? "";
  if (!slug) return { content: JSON.stringify({ error: "No slug provided." }) };

  const listing = await getListing(slug);
  if (!listing) return { content: JSON.stringify({ error: "Listing not found." }) };

  if (name === "get_listing_details") {
    return {
      cards: [toCard(listing)],
      content: JSON.stringify({
        slug: listing.id,
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
      }),
    };
  }
  if (name === "get_nearby_places") {
    return { content: JSON.stringify({ places: listing.nearbyPlaces ?? [] }) };
  }
  return { content: JSON.stringify({ error: "Unknown tool." }) };
}

export async function POST(req: NextRequest) {
  if (!isAiConfigured()) {
    return NextResponse.json({ error: "Chat is currently unavailable." }, { status: 503 });
  }

  const supabase = await createClient();
  const limit = await checkChatLimits(supabase, rateLimitKeyFromRequest(req));
  if (!limit.allowed) {
    return NextResponse.json({ error: limit.message }, { status: 429 });
  }

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Message too long." }, { status: 413 });
  }
  const raw = await req.text().catch(() => "");
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Message too long." }, { status: 413 });
  }
  let body: { messages?: unknown; listingSlug?: unknown } | null = null;
  try {
    body = JSON.parse(raw);
  } catch {
    body = null;
  }
  const history = sanitizeMessages(body?.messages);
  if (!body || history.length === 0) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const listingSlug = safeListingSlug(body.listingSlug);
  const collectedCards: ListingCard[] = [];
  let contactRequest: ContactRequest | null = null;
  const client = getOpenAI();

  let stream: Awaited<ReturnType<typeof client.chat.completions.create>>;
  try {
    const settings = await getSettings();

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: buildSystemPrompt(listingSlug, settings) },
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
      const capped = toolCalls.slice(0, MAX_TOOL_CALLS);
      messages.push({ role: "assistant", content: first.choices[0].message.content, tool_calls: capped });
      for (const call of toolCalls.slice(0, MAX_TOOL_CALLS)) {
        if (call.type !== "function") continue;
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function.arguments);
        } catch {
          // malformed args — runTool below returns a "not found" style error
        }
        const result = await runTool(call.function.name, args, listingSlug);
        if (result.contact) contactRequest = result.contact;
        if (result.cards) collectedCards.push(...result.cards);
        messages.push({ role: "tool", tool_call_id: call.id, content: result.content });
      }
    }

    stream = await client.chat.completions.create({
      model: RECEIPT_MODEL,
      messages,
      max_tokens: MAX_TOKENS,
      stream: true,
    });
  } catch (err) {
    console.error("chat route error:", err);
    return NextResponse.json(
      { error: "The assistant is having trouble responding right now — please try again." },
      { status: 502 }
    );
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content;
          if (text) controller.enqueue(encoder.encode(text));
        }
        // Cards are appended after the text so the widget can render previews.
        const seen = new Set<string>();
        const unique = collectedCards.filter((c) => !seen.has(c.slug) && seen.add(c.slug));
        const marker = encodeCards(unique.slice(0, 4));
        if (marker) controller.enqueue(encoder.encode(marker));
        if (contactRequest) controller.enqueue(encoder.encode(encodeContact(contactRequest)));
      } catch (err) {
        console.error("chat stream error:", err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
