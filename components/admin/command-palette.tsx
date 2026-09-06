"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { Icon } from "@/components/icon";
import { navGroups } from "@/lib/admin/nav-groups";
import { searchAdmin, type AdminSearchResult, type AdminSearchResultType } from "@/app/admin/search-actions";

type FlatItem = {
  key: string;
  icon: string;
  label: string;
  sublabel?: string | null;
  href: string;
};

type Section = { title: string; items: FlatItem[] };

const PAGE_INDEX: (FlatItem & { group: string })[] = navGroups.flatMap((g) =>
  g.items.map((item) => ({
    key: `page:${item.href}`,
    icon: item.icon,
    label: item.label,
    href: item.href,
    group: g.group ?? "Pages",
  }))
);

const ENTITY_SECTION_TITLE: Record<AdminSearchResultType, string> = {
  tenant: "Tenants",
  owner: "Owners",
  property: "Properties",
  unit: "Units",
  vendor: "Vendors",
  invoice: "Invoices",
  ticket: "Tickets",
};

const ENTITY_ICON: Record<AdminSearchResultType, string> = {
  tenant: "groups",
  owner: "person",
  property: "apartment",
  unit: "door_front",
  vendor: "handyman",
  invoice: "request_quote",
  ticket: "confirmation_number",
};

const ENTITY_ORDER: AdminSearchResultType[] = [
  "tenant", "owner", "property", "unit", "vendor", "invoice", "ticket",
];

function filterPages(query: string): (FlatItem & { group: string })[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return PAGE_INDEX;

  return PAGE_INDEX
    .map((item) => {
      const label = item.label.toLowerCase();
      const group = item.group.toLowerCase();
      const matches = tokens.every((t) => label.includes(t) || group.includes(t));
      if (!matches) return null;
      let rank = 3;
      if (label === tokens.join(" ")) rank = 0;
      else if (label.startsWith(tokens[0])) rank = 1;
      else if (label.includes(tokens[0])) rank = 2;
      return { item, rank };
    })
    .filter((x): x is { item: FlatItem & { group: string }; rank: number } => x !== null)
    .sort((a, b) => a.rank - b.rank)
    .map((x) => x.item);
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [liveResults, setLiveResults] = useState<AdminSearchResult[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const reqIdRef = useRef(0);

  function openPalette() {
    setQuery("");
    setActiveIndex(0);
    setLiveResults([]);
    setOpen(true);
  }

  // Global ⌘K / Ctrl+K shortcut — registered once; AdminShell doesn't remount per navigation.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openPalette();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function onChangeQuery(value: string) {
    setQuery(value);
    setActiveIndex(0);
  }

  // Debounced live record search. All setState calls happen inside the timer/promise
  // callback (not synchronously in the effect body) so a stale response never lands.
  useEffect(() => {
    const q = query.trim();
    const myReq = ++reqIdRef.current;

    if (q.length < 2) {
      const t = setTimeout(() => {
        if (reqIdRef.current === myReq) {
          setLiveResults([]);
          setLiveLoading(false);
        }
      }, 0);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => {
      if (reqIdRef.current !== myReq) return;
      setLiveLoading(true);
      searchAdmin(q).then((results) => {
        if (reqIdRef.current === myReq) {
          setLiveResults(results);
          setLiveLoading(false);
        }
      });
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  const sections: Section[] = useMemo(() => {
    if (query.trim() === "") {
      return navGroups.map((g) => ({
        title: g.group ?? "Pages",
        items: g.items.map((item) => ({ key: `page:${item.href}`, icon: item.icon, label: item.label, href: item.href })),
      }));
    }

    const out: Section[] = [];
    const pageMatches = filterPages(query).slice(0, 8);
    if (pageMatches.length > 0) {
      out.push({ title: "Pages", items: pageMatches });
    }

    for (const type of ENTITY_ORDER) {
      const items = liveResults.filter((r) => r.type === type);
      if (items.length === 0) continue;
      out.push({
        title: ENTITY_SECTION_TITLE[type],
        items: items.map((r) => ({
          key: `${r.type}:${r.id}`,
          icon: ENTITY_ICON[type],
          label: r.label,
          sublabel: r.sublabel,
          href: r.href,
        })),
      });
    }

    return out;
  }, [query, liveResults]);

  const flat = useMemo(() => sections.flatMap((s) => s.items), [sections]);
  const hasQuery = query.trim().length >= 2;
  const showEmpty = hasQuery && !liveLoading && flat.length === 0;

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(flat.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flat[activeIndex];
      if (item) go(item.href);
    }
  }

  let runningIndex = -1;

  return (
    <>
      <button
        type="button"
        aria-label="Search (Cmd+K)"
        onClick={openPalette}
        className="flex h-10 items-center gap-2 rounded-md border border-line px-3 text-sm text-slate hover:bg-surface-gray hover:text-navy"
      >
        <Icon name="search" size={18} />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden rounded border border-line bg-surface-gray px-1.5 py-0.5 text-[10px] font-medium sm:inline">⌘K</kbd>
      </button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-navy/40" />
          <Dialog.Content
            onOpenAutoFocus={(e) => { e.preventDefault(); inputRef.current?.focus(); }}
            className="fixed left-1/2 top-[15vh] z-50 flex max-h-[70vh] w-[90vw] max-w-xl -translate-x-1/2 flex-col overflow-hidden rounded-lg bg-surface shadow-xl"
          >
            <Dialog.Title className="sr-only">Search the admin dashboard</Dialog.Title>
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <Icon name="search" size={18} className="text-slate" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => onChangeQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search pages, tenants, owners, invoices…"
                className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-slate-soft"
              />
              {liveLoading && <Icon name="progress_activity" size={16} className="animate-spin text-slate" />}
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              {showEmpty ? (
                <p className="px-4 py-6 text-center text-sm text-slate">No results for &ldquo;{query}&rdquo;.</p>
              ) : (
                sections.map((section) => (
                  <div key={section.title} className="mb-1">
                    <p className="px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-slate">{section.title}</p>
                    {section.items.map((item) => {
                      runningIndex += 1;
                      const idx = runningIndex;
                      const active = idx === activeIndex;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onMouseEnter={() => setActiveIndex(idx)}
                          onClick={() => go(item.href)}
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm ${active ? "bg-navy/5 text-navy" : "text-ink hover:bg-surface-gray"}`}
                        >
                          <Icon name={item.icon} size={18} className="shrink-0 text-navy-700" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{item.label}</span>
                            {item.sublabel && <span className="block truncate text-xs text-slate">{item.sublabel}</span>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
