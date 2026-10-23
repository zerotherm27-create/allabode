"use client";

import type { RefObject } from "react";

type Props = { target: RefObject<HTMLTextAreaElement | null> };

/** Replace the textarea selection and keep it uncontrolled (the form reads the DOM value). */
function apply(el: HTMLTextAreaElement, fn: (sel: string, before: string, after: string) => { text: string; selStart: number; selEnd: number }) {
  const { selectionStart: s, selectionEnd: e, value } = el;
  const r = fn(value.slice(s, e), value.slice(0, s), value.slice(e));
  el.focus();
  el.setSelectionRange(s, e);
  // execCommand keeps the browser undo stack; fall back to direct assignment.
  if (!document.execCommand?.("insertText", false, r.text)) {
    el.value = value.slice(0, s) + r.text + value.slice(e);
  }
  el.setSelectionRange(s + r.selStart, s + r.selEnd);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

const wrap = (mark: string, placeholder: string) => (el: HTMLTextAreaElement) =>
  apply(el, (sel) => {
    const inner = sel || placeholder;
    return { text: `${mark}${inner}${mark}`, selStart: mark.length, selEnd: mark.length + inner.length };
  });

/** Prefix every line touched by the selection. */
const prefixLines = (prefix: (i: number) => string) => (el: HTMLTextAreaElement) => {
  const { selectionStart: s, selectionEnd: e, value } = el;
  const start = value.lastIndexOf("\n", s - 1) + 1;
  const endIdx = value.indexOf("\n", e);
  const end = endIdx === -1 ? value.length : endIdx;
  const lines = value.slice(start, end).split("\n");
  const out = lines.map((l, i) => prefix(i) + l.replace(/^\s*(?:[-*•]|\d+[.)]|#{1,3})\s+/, "")).join("\n");
  el.focus();
  el.setSelectionRange(start, end);
  if (!document.execCommand?.("insertText", false, out)) {
    el.value = value.slice(0, start) + out + value.slice(end);
  }
  el.setSelectionRange(start, start + out.length);
  el.dispatchEvent(new Event("input", { bubbles: true }));
};

const link = (el: HTMLTextAreaElement) => {
  const url = window.prompt("Link address (https://…)", "https://");
  if (!url || !/^(https?:\/\/|mailto:|tel:)/i.test(url.trim())) return;
  apply(el, (sel) => {
    const label = sel || "link text";
    return { text: `[${label}](${url.trim()})`, selStart: 1, selEnd: 1 + label.length };
  });
};

const BUTTONS: { label: string; title: string; cls?: string; run: (el: HTMLTextAreaElement) => void }[] = [
  { label: "B", title: "Bold", cls: "font-bold", run: wrap("**", "bold text") },
  { label: "I", title: "Italic", cls: "italic", run: wrap("*", "italic text") },
  { label: "H", title: "Section heading", cls: "font-semibold", run: prefixLines(() => "## ") },
  { label: "• List", title: "Bulleted list", run: prefixLines(() => "- ") },
  { label: "1. List", title: "Numbered list", run: prefixLines((i) => `${i + 1}. `) },
  { label: "Link", title: "Insert link", run: link },
];

export function RichTextToolbar({ target }: Props) {
  return (
    <div role="toolbar" aria-label="Description formatting" className="mb-1.5 flex flex-wrap items-center gap-1">
      {BUTTONS.map((b) => (
        <button
          key={b.title}
          type="button"
          title={b.title}
          aria-label={b.title}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => target.current && b.run(target.current)}
          className={`inline-flex h-9 min-w-9 items-center justify-center rounded border border-line bg-surface px-2.5 text-xs text-navy hover:border-navy/40 hover:bg-cream focus-visible:outline-2 focus-visible:outline-gold ${b.cls ?? ""}`}
        >
          {b.label}
        </button>
      ))}
      <span className="ml-1 text-xs text-slate">Select text, then click a button. Blank line = new paragraph.</span>
    </div>
  );
}
