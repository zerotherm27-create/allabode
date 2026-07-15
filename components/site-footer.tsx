import Link from "next/link";
import { footerNav, site } from "@/lib/site";
import { Logo } from "@/components/logo";
import { getSettings, s } from "@/lib/settings";

export async function SiteFooter() {
  const settings = await getSettings();

  const email       = s(settings, "contact_email")       || site.email;
  const phone       = s(settings, "contact_phone")       || site.phone;
  const serviceArea = s(settings, "contact_service_area") || site.serviceArea;
  const messenger   = s(settings, "social_messenger")    || site.messenger;

  return (
    <footer className="bg-navy text-white">
      <div className="container-site grid gap-8 py-10 md:grid-cols-[minmax(0,20rem)_1fr] md:items-start md:py-12">
        <div>
          <Logo variant="white" className="h-12" />
          <p className="mt-2 text-xs tracking-wider text-gold/80">Real Estate Services</p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/60">
            Real estate support for owners, buyers, sellers, tenants, and
            investors. Operated by {site.legalName}.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
          <div>
            <p className="label-caps text-white/40">Services</p>
            <div className="mt-3 flex flex-col gap-1.5 text-sm text-white/70">
              {footerNav.services.map((item) => (
                <Link key={item.label} href={item.href} className="transition-colors hover:text-gold">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="label-caps text-white/40">Listings</p>
            <div className="mt-3 flex flex-col gap-1.5 text-sm text-white/70">
              {footerNav.listings.map((item) => (
                <Link key={item.label} href={item.href} className="transition-colors hover:text-gold">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2 lg:col-span-1 lg:min-w-48">
            <p className="label-caps text-white/40">Contact</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-white/70 lg:flex-col lg:gap-y-1.5">
              <a href={`mailto:${email}`} className="hover:text-gold">{email}</a>
              <a href={`tel:${phone.replace(/\s/g, "")}`} className="hover:text-gold">{phone}</a>
              <a href={messenger} className="hover:text-gold">Messenger</a>
              <span>{serviceArea}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-site flex flex-col gap-3 py-4 text-xs text-white/40 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-1.5">
            <p>© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {footerNav.compliance.map((item) => (
                <Link key={item.label} href={item.href} className="transition-colors hover:text-white/60">
                  {item.label}
                </Link>
              ))}
            </div>
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
    </footer>
  );
}
