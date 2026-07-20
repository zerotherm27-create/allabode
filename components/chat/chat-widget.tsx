"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon";

type Message = { role: "user" | "assistant"; content: string };

const HINT_SHOW_DELAY_MS = 2500;
const HINT_AUTO_HIDE_MS = 7000;

export function ChatWidget() {
  const pathname = usePathname();
  const listingSlug = pathname?.match(/^\/listings\/([^/]+)$/)?.[1];

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [hintDismissed, setHintDismissed] = useState(false);
  const [hintShown, setHintShown] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setHintShown(true), HINT_SHOW_DELAY_MS);
    return () => clearTimeout(showTimer);
  }, []);

  useEffect(() => {
    if (!hintShown) return;
    const hideTimer = setTimeout(() => setHintDismissed(true), HINT_AUTO_HIDE_MS);
    return () => clearTimeout(hideTimer);
  }, [hintShown]);

  const showHint = hintShown && !hintDismissed && !open;

  async function send() {
    const text = input.trim();
    if (!text || pending) return;
    setError("");
    setInput("");
    const nextMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setPending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, listingSlug }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Something went wrong — please try again.");
        setMessages(nextMessages);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages([...nextMessages, { role: "assistant", content: acc }]);
      }
    } catch {
      setError("Couldn't reach the assistant — please try again.");
      setMessages(nextMessages);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 flex h-[28rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between border-b border-line bg-navy px-4 py-3 text-white">
            <p className="text-sm font-semibold">Abbie · All Abode Assistant</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close chat">
              <Icon name="close" size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex flex-col gap-3">
              {messages.length === 0 && (
                <div className="max-w-[85%] self-start rounded-md bg-surface-gray px-3 py-2 text-sm text-ink">
                  {listingSlug
                    ? "Hi, I'm Abbie! I can answer questions about this listing, or about our other services — what would you like to know?"
                    : "Hi, I'm Abbie, the All Abode assistant. Ask me about our services, or open a listing and ask about that property specifically."}
                </div>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${
                    m.role === "user" ? "self-end bg-navy text-white" : "self-start bg-surface-gray text-ink"
                  }`}
                >
                  {m.content || (pending && i === messages.length - 1 ? "…" : "")}
                </div>
              ))}
            </div>
            {error && (
              <p role="alert" className="mt-2 text-xs text-error">
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-line p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              placeholder="Type a message…"
              disabled={pending}
              className="h-10 flex-1 rounded-md border border-line bg-surface px-3 text-sm focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15"
            />
            <button
              type="button"
              onClick={send}
              disabled={pending || !input.trim()}
              aria-label="Send message"
              className="flex h-10 w-10 items-center justify-center rounded-md bg-navy text-white disabled:opacity-50"
            >
              <Icon
                name={pending ? "progress_activity" : "send"}
                size={18}
                className={pending ? "animate-spin" : ""}
              />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        {!open && (
          <div
            className={`flex items-center gap-2 rounded-md bg-navy py-2 pl-4 pr-2 text-white shadow-[var(--shadow-card)] ring-1 ring-gold/30 transition-all duration-[var(--dur-mid)] ease-[var(--ease-out)] ${
              showHint ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-2 opacity-0"
            }`}
          >
            <span className="text-sm font-medium whitespace-nowrap">Ask Abbie</span>
            <button
              type="button"
              onClick={() => setHintDismissed(true)}
              aria-label="Dismiss"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-white/60 hover:text-white"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setOpen((o) => !o);
            setHintDismissed(true);
          }}
          aria-label={open ? "Close chat" : "Chat with Abbie"}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-navy text-white shadow-[var(--shadow-card)] hover:bg-navy-800"
        >
          <Icon name={open ? "close" : "chat"} size={26} />
        </button>
      </div>
    </div>
  );
}
