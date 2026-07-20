import { s, type Settings } from "@/lib/settings";
import { site, founder } from "@/lib/site";
import { services, type Service } from "@/lib/data";
import { faqSections } from "@/lib/faq-data";
import { tokenize } from "./text-match";

export type FaqIndexItem = {
  sectionId: string;
  q: string;
  a: string;
  tokens: string[];
  /** Tokens from this item's own `tokens` that are genuinely distinguishing —
   *  i.e. rare across the whole FAQ corpus, not just long words. A word like
   *  "property" is long but appears in dozens of questions, so it shouldn't
   *  count as a high-signal match on its own; "abroad" or "notarial" should. */
  rareTokens: Set<string>;
};

export type KnowledgeBase = {
  phone: string;
  email: string;
  location: string;
  serviceArea: string;
  messenger?: string;
  whatsapp?: string;
  viber?: string;
  services: Service[];
  founder: typeof founder;
  faqIndex: FaqIndexItem[];
};

// Common words excluded from FAQ token-overlap scoring so they don't inflate
// matches on unrelated questions that just happen to share filler words.
const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "do", "does", "can", "could", "will", "would",
  "i", "you", "your", "my", "we", "us", "our", "it", "this", "that", "these", "those",
  "what", "when", "where", "who", "how", "why", "which",
  "for", "of", "to", "in", "on", "at", "and", "or", "with", "if", "be", "get", "need",
]);

/** A token counts as "rare" (high-signal) only if it shows up in this few FAQ items or fewer. */
const RARE_TOKEN_MAX_DOCS = 2;

function buildFaqIndex(): FaqIndexItem[] {
  const draft = faqSections.flatMap((section) =>
    section.items.map((item) => ({
      sectionId: section.id,
      q: item.q,
      a: item.a,
      tokens: tokenize(item.q).filter((t) => !STOPWORDS.has(t)),
    }))
  );

  const docFrequency = new Map<string, number>();
  for (const item of draft) {
    for (const t of new Set(item.tokens)) {
      docFrequency.set(t, (docFrequency.get(t) ?? 0) + 1);
    }
  }

  return draft.map((item) => ({
    ...item,
    rareTokens: new Set(
      item.tokens.filter((t) => t.length >= 4 && (docFrequency.get(t) ?? 0) <= RARE_TOKEN_MAX_DOCS)
    ),
  }));
}

const FAQ_INDEX: FaqIndexItem[] = buildFaqIndex();

export function buildKnowledgeBase(settings: Settings): KnowledgeBase {
  return {
    phone: s(settings, "contact_phone") || site.phone,
    email: s(settings, "contact_email") || site.email,
    location: s(settings, "contact_location") || site.location,
    serviceArea: s(settings, "contact_service_area") || site.serviceArea,
    messenger: s(settings, "social_messenger") || site.messenger,
    whatsapp: s(settings, "social_whatsapp") || site.whatsapp,
    viber: s(settings, "social_viber") || site.viber,
    services,
    founder,
    faqIndex: FAQ_INDEX,
  };
}

/** The one canonical "how to reach us" string — used by both the contact-info
 *  intent and the fallback template so they can't drift apart. */
export function formatContactBlock(kb: KnowledgeBase): string {
  const channels = [
    `call or text ${kb.phone}`,
    `email ${kb.email}`,
    kb.messenger ? `Messenger (${kb.messenger})` : "",
    kb.whatsapp ? `WhatsApp (${kb.whatsapp})` : "",
    kb.viber ? `Viber (${kb.viber})` : "",
  ]
    .filter(Boolean)
    .join(", ");
  return `You can reach us directly: ${channels}. We're based in ${kb.location} and serve ${kb.serviceArea}.`;
}
