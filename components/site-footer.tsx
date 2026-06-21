import Link from "next/link";
import { footerNav, site } from "@/lib/site";
import { Icon } from "@/components/icon";

const socials = [
  { name: "facebook", href: "https://facebook.com", icon: "share" },
  { name: "email", href: site.emailHref, icon: "alternate_email" },
  { name: "phone", href: site.phoneHref, icon: "call" },
];

export function SiteFooter() {
  return (
    <footer className="bg-navy text-white">
      <div className="container-site grid grid-cols-1 gap-12 py-16 md:grid-cols-12 md:py-20">
        {/* Brand */}
        <div className="md:col-span-5">
          <span className="font-display text-xl font-bold text-gold">
            {site.name}
          </span>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-soft">
            Your trusted partner for licensed real estate services in the
            Philippines. We combine institutional expertise with a personalized
            approach to property management and appraisal.
          </p>
          <div className="mt-7 flex gap-3">
            {socials.map((s) => (
              <a
                key={s.name}
                href={s.href}
                aria-label={s.name}
                className="flex h-10 w-10 items-center justify-center border border-white/15 text-slate-soft transition-colors hover:border-gold hover:text-gold"
              >
                <Icon name={s.icon} size={20} />
              </a>
            ))}
          </div>
        </div>

        {/* Services */}
        <div className="md:col-span-2">
          <p className="label-caps text-white">Services</p>
          <ul className="mt-6 space-y-3 text-sm text-slate-soft">
            {footerNav.services.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="transition-colors hover:text-gold"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Quick Links */}
        <div className="md:col-span-2">
          <p className="label-caps text-white">Quick Links</p>
          <ul className="mt-6 space-y-3 text-sm text-slate-soft">
            {footerNav.quickLinks.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="transition-colors hover:text-gold"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div className="md:col-span-3">
          <p className="label-caps text-white">Get in Touch</p>
          <ul className="mt-6 space-y-4 text-sm text-slate-soft">
            <li className="flex items-start gap-3">
              <Icon name="location_on" size={20} className="text-gold" />
              <span>{site.location}</span>
            </li>
            <li className="flex items-start gap-3">
              <Icon name="call" size={20} className="text-gold" />
              <a href={site.phoneHref} className="hover:text-gold">
                {site.phone}
              </a>
            </li>
            <li className="flex items-start gap-3">
              <Icon name="mail" size={20} className="text-gold" />
              <a href={site.emailHref} className="hover:text-gold">
                {site.email}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-site flex flex-col items-center justify-between gap-3 py-6 text-xs text-slate-soft sm:flex-row">
          <p>
            © {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
          <p>{site.serviceArea}</p>
        </div>
      </div>
    </footer>
  );
}
