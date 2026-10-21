import Image from "next/image";
import type { Metadata } from "next";
import { parseToken } from "@/lib/nurture/message";
import { UnsubscribeConfirmForm } from "./confirm-form";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/**
 * Public unsubscribe page (the link in every follow-up email). Opening the
 * page changes nothing, so link scanners can't unsubscribe anyone; the
 * visitor confirms with a button. Nothing about the lead is shown.
 */
export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token: raw } = await params;
  const token = parseToken(raw);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-navy px-4 py-10">
      <div className="w-full max-w-sm rounded-lg border border-line bg-surface p-8 text-center">
        <Image
          src="/logo/logo-primary.png"
          alt="All Abode Property Solutions"
          width={160}
          height={48}
          className="mx-auto mb-6 h-10 w-auto"
        />
        {token ? (
          <UnsubscribeConfirmForm token={token} />
        ) : (
          <div role="alert">
            <h1 className="font-display text-xl font-bold text-navy">This link is not valid</h1>
            <p className="mt-2 text-sm text-slate">
              It may be incomplete. Please use the unsubscribe link from your most recent email, or contact All
              Abode Property Solutions and we will remove you.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
