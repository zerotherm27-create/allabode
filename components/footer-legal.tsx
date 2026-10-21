import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";

/**
 * The footer's bottom row: copyright, legal links, the BIR registration badge
 * and the operator disclaimer. Shared by the main site footer and the
 * specialist microsite footer (which passes absolute apex URLs, since a
 * specialist subdomain redirects every other path).
 */
export function FooterLegal({ links }: { links: readonly { label: string; href: string }[] }) {
  return (
    <div className="border-t border-white/10">
      <div className="container-site flex flex-col gap-3 py-4 text-xs text-white/40 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-1.5">
          <p>© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {links.map((item) => (
              <Link key={item.label} href={item.href} className="transition-colors hover:text-white/60">
                {item.label}
              </Link>
            ))}
          </div>
          <BirBadge />
        </div>
        <p className="max-w-2xl text-white/30 md:text-right">
          All Abode is operated by All Abode Brokerage and Valuation OPC, a
          Philippine real estate service company providing brokerage,
          valuation, leasing, property management, and documentation
          assistance services. Brokerage and valuation services are performed
          under the supervision of duly licensed real estate service
          practitioners. Property details, pricing, availability, and terms
          are subject to verification.
        </p>
      </div>
    </div>
  );
}

/** BIR "Registered 2026" badge linking to the bureau's verification page. */
export function BirBadge() {
  return (
    <a
      href="https://verify.bir.gov.ph/correspondence/9ddd360e9d924f559a515cd20b6f587b"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Verify BIR registration (opens in a new tab)"
      className="mt-2 block w-fit rounded-md border border-white/10 bg-surface p-1 outline-offset-4 focus-visible:outline-gold!"
    >
      <Image
        src="/bir-registered-2026.jpeg"
        alt="BIR Registered 2026 — All Abode Brokerage and Valuation OPC, Bureau of Internal Revenue"
        width={507}
        height={172}
        sizes="(min-width: 768px) 224px, 192px"
        unoptimized
        className="block h-auto w-48 max-w-full md:w-56 rounded-sm"
      />
    </a>
  );
}
