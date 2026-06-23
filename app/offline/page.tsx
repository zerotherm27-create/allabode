import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";

export const metadata: Metadata = { title: "Offline", robots: { index: false } };

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-navy px-6 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-white/10 text-gold">
        <Icon name="cloud_off" size={36} />
      </span>
      <h1 className="mt-6 font-display text-2xl font-bold text-white">You&rsquo;re offline</h1>
      <p className="mt-2 max-w-sm text-sm text-white/70">
        This page needs a connection. Pages you&rsquo;ve already opened still work — reconnect to
        load new data or sign in.
      </p>
      <Link
        href="/"
        className="mt-7 inline-flex items-center gap-2 rounded-md bg-gold px-5 py-2.5 text-sm font-semibold text-navy transition-colors hover:bg-gold-bright"
      >
        <Icon name="home" size={18} /> Go to homepage
      </Link>
    </div>
  );
}
