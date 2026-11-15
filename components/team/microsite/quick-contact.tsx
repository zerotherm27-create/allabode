import type { ReactNode } from "react";
import { Icon } from "@/components/icon";
import { SocialGlyph } from "@/components/team/microsite/social-icons";
import type { ContactRow, ContactRowKey } from "@/lib/team/contact-rows";

const ICONS: Partial<Record<ContactRowKey, string>> = {
  phone: "call",
  email: "mail",
  web: "public",
  location: "location_on",
};

/** The icon for a contact row: a Material Symbol, or the brand glyph for Viber / Facebook / LinkedIn. */
export function ContactRowIcon({ rowKey, className = "" }: { rowKey: ContactRowKey; className?: string }): ReactNode {
  if (rowKey === "viber" || rowKey === "facebook" || rowKey === "linkedin") {
    return (
      <span className={`inline-flex size-[22px] shrink-0 items-center justify-center [&>svg]:size-full ${className}`}>
        <SocialGlyph network={rowKey} size={20} />
      </span>
    );
  }
  return <Icon name={ICONS[rowKey] ?? "public"} size={22} className={`shrink-0 ${className}`} />;
}

/**
 * The Signature layout's quick-contact bar (md and up): the direct ways to
 * reach the specialist as equal cells, closed by a jump to the message form.
 * Cells size themselves to however many links the specialist published.
 */
export function QuickContactBar({ rows }: { rows: ContactRow[] }) {
  const cell =
    "flex min-h-[4.5rem] items-center justify-center gap-3 px-4 font-display text-base font-semibold text-navy transition-colors duration-[var(--dur-mid)] hover:bg-surface-gray hover:text-navy-700";
  return (
    <ul className="grid auto-cols-fr grid-flow-col border border-line bg-surface shadow-[var(--shadow-card)]">
      {rows.map((r) => (
        <li key={r.key} className="min-w-0 border-r border-line">
          <a href={r.href ?? undefined} aria-label={r.ariaLabel} className={cell}>
            <ContactRowIcon rowKey={r.key} className="text-gold-ink" />
            {r.key === "email" ? "Email me" : r.key === "viber" ? "Viber" : r.label}
          </a>
        </li>
      ))}
      <li className="min-w-0">
        <a href="#contact" className={cell}>
          <Icon name="chat" size={22} className="shrink-0 text-gold-ink" />
          Send a message
        </a>
      </li>
    </ul>
  );
}
