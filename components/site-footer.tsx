import Link from "next/link";
import Image from "next/image";
import { footerNav, site } from "@/lib/site";
import { Icon } from "@/components/icon";

const socials = [
  { name: "Facebook", href: site.facebook, icon: "public" },
  { name: "Messenger", href: site.messenger, icon: "forum" },
  { name: "WhatsApp / Viber", href: site.whatsapp, icon: "chat" },
  { name: "Email", href: site.emailHref, icon: "mail" },
];

export function SiteFooter() {
  return (
    <footer className="bg-navy text-white">
      <div className="container-site grid grid-cols-1 gap-12 py-16 md:grid-cols-12 md:py-20">
        {/* Brand */}
        <div className="md:col-span-4">
          <Image
            src="/logo/logo-white-icon.png"
            alt="All Abode Property Solutions"
            width={160}
            height={50}
            className="h-10 w-auto"
          />
          <p className="mt-3 text-xs tracking-wider text-gold/80">
            {site.descriptor}
          </p>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-white/60">
            {site.name} provides brokerage, leasing, property management, and
            appraisal support for clients who need professional property
            guidance in the Philippines.
          </p>
          <div className="mt-7 flex gap-3">
            {socials.map((s) => (
              <a
                key={s.name}
                href={s.href}
                aria-label={s.name}
                className="flex h-10 w-10 items-center justify-center border border-white/15 text-white/60 transition-colors hover:border-gold hover:text-gold"
              >
                <Icon name={s.icon} size={20} />
              </a>
            ))}
          </div>
        </div>

        {/* Services */}
        <div className="md:col-span-2">
          <p className="label-caps text-white">Services</p>
          <ul className="mt-6 space-y-3 text-sm text-white/60">
            {footerNav.services.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition-colors hover:text-gold">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Client Actions */}
        <div className="md:col-span-3">
          <p className="label-caps text-white">Client Actions</p>
          <ul className="mt-6 space-y-3 text-sm text-white/60">
            {footerNav.clientActions.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition-colors hover:text-gold">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div className="md:col-span-3">
          <p className="label-caps text-white">Contact</p>
          <ul className="mt-6 space-y-4 text-sm text-white/60">
            <li className="flex items-start gap-3">
              <Icon name="mail" size={18} className="mt-0.5 shrink-0 text-gold" />
              <a href={site.emailHref} className="hover:text-gold">
                {site.email}
              </a>
            </li>
            <li className="flex items-start gap-3">
              <Icon name="call" size={18} className="mt-0.5 shrink-0 text-gold" />
              <a href={site.phoneHref} className="hover:text-gold">
                Mobile / Viber / WhatsApp: {site.phone}
              </a>
            </li>
            <li className="flex items-start gap-3">
              <Icon name="forum" size={18} className="mt-0.5 shrink-0 text-gold" />
              <a href={site.messenger} className="hover:text-gold">
                Facebook / Messenger
              </a>
            </li>
            <li className="flex items-start gap-3">
              <Icon name="location_on" size={18} className="mt-0.5 shrink-0 text-gold" />
              <span>Service Area: {site.serviceArea}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-site flex flex-col gap-3 py-6 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
          <p className="text-white/30">
            Property details, pricing, availability, and terms are subject to verification.
            Formal appraisal services require professional review, documentation, and scope confirmation.
          </p>
        </div>
      </div>
    </footer>
  );
}
