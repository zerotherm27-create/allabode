import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { ContactRowIcon } from "@/components/team/microsite/quick-contact";
import type { ContactRow } from "@/lib/team/contact-rows";
import { firstNameOf } from "@/lib/team/profile-copy";

/**
 * The sticky card beside the listings in the Listings-first layout (lg and
 * up): the direct contact links and the jump to the message form, so asking
 * about a property is always one click away while browsing.
 */
export function MicrositeContactCard({ name, rows }: { name: string; rows: ContactRow[] }) {
  return (
    <div className="border border-line bg-surface p-6">
      <h3 className="font-display text-xl font-bold leading-snug text-navy">Ask {firstNameOf(name)} about a property</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate">Viewings, availability, pricing and terms.</p>
      {rows.length > 0 && (
        <ul className="mt-4 flex flex-col border-t border-line">
          {rows.map((r) => (
            <li key={r.key} className="border-b border-line">
              <a
                href={r.href ?? undefined}
                aria-label={r.key === "email" ? undefined : r.ariaLabel}
                className="flex min-h-[48px] items-center gap-3 break-all text-sm font-medium text-ink transition-colors hover:text-navy-700"
              >
                <ContactRowIcon rowKey={r.key} className="text-gold-ink" />
                {r.label}
              </a>
            </li>
          ))}
        </ul>
      )}
      <Button href="#contact" variant="gold" size="lg" className="mt-5 w-full whitespace-nowrap">
        Inquire now
        <Icon name="arrow_forward" size={16} />
      </Button>
    </div>
  );
}
