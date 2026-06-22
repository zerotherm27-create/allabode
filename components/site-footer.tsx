import Link from "next/link";
import Image from "next/image";
import { footerNav, site } from "@/lib/site";
import { Icon } from "@/components/icon";
import { getSettings, s } from "@/lib/settings";

export async function SiteFooter() {
  const settings = await getSettings();

  const email       = s(settings, "contact_email")       || site.email;
  const phone       = s(settings, "contact_phone")       || site.phone;
  const serviceArea = s(settings, "contact_service_area") || site.serviceArea;
  const facebook    = s(settings, "social_facebook")     || site.facebook;
  const messenger   = s(settings, "social_messenger")    || site.messenger;
  const whatsapp    = s(settings, "social_whatsapp")     || site.whatsapp;
  const descriptor  = s(settings, "brand_descriptor")    || site.descriptor;

  const socials = [
    { name: "Facebook",          href: facebook,  icon: "public" },
    { name: "Messenger",         href: messenger, icon: "forum" },
    { name: "WhatsApp / Viber",  href: whatsapp,  icon: "chat" },
    { name: "Email",             href: `mailto:${email}`, icon: "mail" },
  ];

  return (
    <footer className="bg-navy text-white">
      <div className="container-site grid grid-cols-1 gap-12 py-16 md:grid-cols-12 md:py-20">
        {/* Brand */}
        <div className="md:col-span-3">
          <Image
            src="/logo/logo-2-white.png"
            alt="All Abode Property Solutions"
            width={240}
            height={75}
            className="h-10 w-auto"
          />
          <p className="mt-3 text-xs tracking-wider text-gold/80">{descriptor}</p>
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
              <li key={item.label}>
                <Link href={item.href} className="transition-colors hover:text-gold">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Client Actions */}
        <div className="md:col-span-2">
          <p className="label-caps text-white">Client Actions</p>
          <ul className="mt-6 space-y-3 text-sm text-white/60">
            {footerNav.clientActions.map((item) => (
              <li key={item.label}>
                <Link href={item.href} className="transition-colors hover:text-gold">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Resources */}
        <div className="md:col-span-2">
          <p className="label-caps text-white">Guides</p>
          <ul className="mt-6 space-y-3 text-sm text-white/60">
            {footerNav.resources.map((item) => (
              <li key={item.label}>
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
              <a href={`mailto:${email}`} className="hover:text-gold">{email}</a>
            </li>
            <li className="flex items-start gap-3">
              <Icon name="call" size={18} className="mt-0.5 shrink-0 text-gold" />
              <a href={`tel:${phone.replace(/\s/g, "")}`} className="hover:text-gold">
                Mobile / Viber / WhatsApp: {phone}
              </a>
            </li>
            <li className="flex items-start gap-3">
              <Icon name="forum" size={18} className="mt-0.5 shrink-0 text-gold" />
              <a href={messenger} className="hover:text-gold">Facebook / Messenger</a>
            </li>
            <li className="flex items-start gap-3">
              <Icon name="location_on" size={18} className="mt-0.5 shrink-0 text-gold" />
              <span>Service Area: {serviceArea}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-site flex flex-col gap-3 py-6 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <p>© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
            <Link href="/privacy-policy" className="transition-colors hover:text-white/60">
              Privacy Policy
            </Link>
          </div>
          <p className="text-white/30">
            Property details, pricing, availability, and terms are subject to verification.
            Formal appraisal services require professional review, documentation, and scope confirmation.
          </p>
        </div>
      </div>
    </footer>
  );
}
