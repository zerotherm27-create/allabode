"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/icon";

type Notif = {
  id: string; title: string; body: string; link: string | null;
  is_read: boolean; created_at: string;
};

export function NotificationBell({ role }: { role: "tenant" | "owner" }) {
  const [notifs, setNotifs]   = useState<Notif[]>([]);
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(true);
  const panelRef              = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("notifications")
      .select("id,title,body,link,is_read,created_at")
      .order("created_at", { ascending: false })
      .limit(15)
      .then(({ data }) => {
        setNotifs((data ?? []) as Notif[]);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function markRead(id: string) {
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    await createClient().from("notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("id", id);
  }

  async function markAllRead() {
    const unread = notifs.filter((n) => !n.is_read).map((n) => n.id);
    if (!unread.length) return;
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await createClient().from("notifications").update({ is_read: true, read_at: new Date().toISOString() }).in("id", unread);
  }

  const unreadCount = notifs.filter((n) => !n.is_read).length;
  const noticesHref = `/dashboard/${role}/notices`;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex size-10 items-center justify-center rounded-md text-slate hover:bg-surface-gray hover:text-navy"
      >
        <Icon name="notifications" size={22} />
        {unreadCount > 0 && (
          <span className="absolute right-2 top-2 flex size-4 items-center justify-center rounded-full bg-sold text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-line bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="text-sm font-semibold text-navy">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-navy-700 hover:text-gold">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-center text-sm text-slate">Loading…</p>
            ) : notifs.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate">No notifications yet.</p>
            ) : (
              notifs.map((n) => {
                const content = (
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={`flex items-start gap-3 border-b border-line px-4 py-3 last:border-0 hover:bg-surface-gray cursor-pointer ${!n.is_read ? "bg-navy/2" : ""}`}
                  >
                    <span className={`mt-0.5 size-2 shrink-0 rounded-full ${!n.is_read ? "bg-navy-700" : "bg-transparent"}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${!n.is_read ? "font-semibold text-navy" : "font-medium text-navy"}`}>{n.title}</p>
                      <p className="mt-0.5 text-xs text-slate line-clamp-2">{n.body}</p>
                      <p className="mt-1 text-xs text-slate">{new Date(n.created_at).toLocaleDateString("en-PH")}</p>
                    </div>
                  </div>
                );
                return n.link ? (
                  <Link key={n.id} href={n.link} onClick={() => { markRead(n.id); setOpen(false); }}>
                    {content}
                  </Link>
                ) : (
                  <div key={n.id}>{content}</div>
                );
              })
            )}
          </div>
          <div className="border-t border-line px-4 py-2.5">
            <Link href={noticesHref} onClick={() => setOpen(false)} className="text-xs font-medium text-navy-700 hover:text-gold">
              View all notices →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
