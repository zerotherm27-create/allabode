/**
 * Splits a pasted property description (often AI-written markdown) into
 * labelled facts, an intro paragraph and titled sections so the admin inbox can
 * lay it out instead of showing one wall of text. Pure; never throws.
 */
export type MessageFact = { label: string; value: string };
export type MessageSection = { title: string | null; text: string; items: string[] };
export type ParsedMessage = { facts: MessageFact[]; intro: string; sections: MessageSection[] };

const FACT_RE = /\*\*\s*([^*:\n]{2,40}?)\s*:\s*\*\*\s*([\s\S]*?)(?=\s*\*\*\s*[^*:\n]{2,40}?\s*:\s*\*\*|$)/g;
/** Values longer than this read as a description, not a fact. */
export const LONG_FACT = 70;

function clean(s: string): string {
  return s.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
}

function parseSection(raw: string): MessageSection {
  const nl = raw.indexOf("\n");
  // Without newlines (whitespace already collapsed) the title can't be told apart; keep it as text.
  const title = nl > 0 ? clean(raw.slice(0, nl)) : null;
  const body = nl > 0 ? raw.slice(nl + 1) : raw;
  const hasLineBullets = /^\s*[*\-•]\s+/m.test(body);
  const parts = hasLineBullets ? body.split(/^\s*[*\-•]\s+/m) : body.split(/\s+\*\s+/);
  const text = clean(parts[0]);
  const items = parts.slice(1).map(clean).filter(Boolean);
  return { title, text, items };
}

export function parseProperty(message: string | null | undefined): ParsedMessage {
  const src = (message ?? "").replace(/\r\n/g, "\n").trim();
  if (!src) return { facts: [], intro: "", sections: [] };
  const [head, ...rest] = src.split(/(?:^|\s)##\s+/);
  const facts: MessageFact[] = [];
  let intro = head;
  const first = head.search(/\*\*\s*[^*:\n]{2,40}?\s*:\s*\*\*/);
  if (first >= 0) {
    intro = head.slice(0, first);
    for (const m of head.slice(first).matchAll(FACT_RE)) {
      const value = clean(m[2]);
      if (value) facts.push({ label: clean(m[1]), value });
    }
  }
  return { facts, intro: clean(intro), sections: rest.map(parseSection) };
}
