import type { ReactNode } from "react";

/**
 * Renders a listing description written with the admin formatting toolbar.
 * Supported syntax (a deliberately tiny markdown subset, no raw HTML):
 *   "## Heading" (or a short ALL-CAPS line)  → sub-heading
 *   "- item" / "* item"                      → bullet list
 *   "1. item"                                → numbered list
 *   **bold**, *italic*, [text](https://…)    → inline
 *   blank line                               → new paragraph
 * Everything is emitted as React nodes, so nothing user-typed is ever injected as HTML.
 */

const INLINE = /\*\*(.+?)\*\*|\*(?!\s)([^*]+?)\*(?!\*)|\[([^\]]+)\]\(((?:https?:\/\/|mailto:|tel:)[^\s)]+)\)/g;

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${keyBase}-${i++}`;
    if (m[1] !== undefined) out.push(<strong key={key} className="font-semibold text-navy">{m[1]}</strong>);
    else if (m[2] !== undefined) out.push(<em key={key}>{m[2]}</em>);
    else
      out.push(
        <a key={key} href={m[4]} className="font-medium text-navy-700 underline underline-offset-2 hover:text-gold-ink"
          {...(m[4].startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          {m[3]}
        </a>,
      );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
const HEADING = /^#{1,3}\s+(.*)$/;
const isCapsHeading = (l: string) => {
  const t = l.trim();
  return t.length >= 4 && t.length <= 60 && /[A-Z]/.test(t) && t === t.toUpperCase() && !/[.!?:]$/.test(t) && !/\d{3,}/.test(t);
};

export function ListingDescription({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let n = 0;

  const flushPara = () => {
    if (!para.length) return;
    const k = `p${n++}`;
    blocks.push(
      <p key={k} className="mt-3 leading-relaxed text-slate">
        {para.map((line, i) => (
          <span key={i}>
            {i > 0 && <br />}
            {inline(line, `${k}-${i}`)}
          </span>
        ))}
      </p>,
    );
    para = [];
  };
  const flushList = () => {
    if (!list) return;
    const k = `l${n++}`;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={k} className={`mt-3 space-y-1 pl-5 leading-relaxed text-slate ${list.ordered ? "list-decimal" : "list-disc"}`}>
        {list.items.map((it, i) => (
          <li key={i}>{inline(it, `${k}-${i}`)}</li>
        ))}
      </Tag>,
    );
    list = null;
  };

  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    const bullet = BULLET.exec(line);
    const numbered = bullet ? null : NUMBERED.exec(line);
    const heading = HEADING.exec(line);

    if (!line.trim()) {
      flushPara();
      flushList();
    } else if (bullet || numbered) {
      flushPara();
      const ordered = !!numbered;
      if (list && list.ordered !== ordered) flushList();
      list ??= { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
    } else if (heading || isCapsHeading(line)) {
      flushPara();
      flushList();
      blocks.push(
        <h3 key={`h${n++}`} className="mt-6 font-display text-base font-semibold text-navy">
          {heading ? inline(heading[1], `h${n}`) : line.trim()}
        </h3>,
      );
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();

  return <div>{blocks}</div>;
}
