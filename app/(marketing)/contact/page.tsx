import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PageHero, SectionHeading } from "@/components/sections";
import { ContactForm } from "@/components/forms/lead-forms";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with All Abode Property Solutions for leasing, selling, buying, property management, appraisal, or a consultation. Serving Metro Manila, Cebu, and Davao.",
};

const channels = [
  { icon: "call", label: "Phone", value: site.phone, href: site.phoneHref },
  { icon: "mail", label: "Email", value: site.email, href: site.emailHref },
  { icon: "forum", label: "Facebook / Messenger", value: "Message us on Messenger", href: site.messenger },
  { icon: "chat", label: "WhatsApp", value: site.phone, href: site.whatsapp },
  { icon: "sms", label: "Viber", value: site.phone, href: site.viber },
  { icon: "location_on", label: "Office", value: site.location, href: undefined },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Let's talk about your property."
        subtitle="Tell us what you need — leasing, selling, buying, management, or a valuation — and a licensed member of our team will respond within one business day."
      />

      <section className="py-section">
        <Container className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.2fr]">
          {/* Details */}
          <div>
            <SectionHeading
              align="left"
              eyebrow="Get in Touch"
              title="Reach us directly"
            />
            <ul className="mt-8 flex flex-col gap-5">
              {channels.map((c) => (
                <li key={c.label} className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-navy/5 text-navy-700">
                    <Icon name={c.icon} size={22} />
                  </span>
                  <div>
                    <p className="label-caps text-slate">{c.label}</p>
                    {c.href ? (
                      <a
                        href={c.href}
                        className="mt-1 block font-medium text-navy hover:text-navy-700"
                      >
                        {c.value}
                      </a>
                    ) : (
                      <p className="mt-1 font-medium text-navy">{c.value}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-8 rounded-md border border-line bg-surface-gray p-5">
              <p className="label-caps text-slate">Service Area</p>
              <p className="mt-2 text-navy">{site.serviceArea}</p>
            </div>

            {/* Map placeholder */}
            <div className="mt-6 flex aspect-[16/10] items-center justify-center rounded-lg border border-line bg-gradient-to-br from-navy via-navy-800 to-navy-700 text-white/70">
              <span className="flex flex-col items-center gap-2 text-sm">
                <Icon name="map" size={32} className="text-gold" />
                Map — {site.location}
              </span>
            </div>
          </div>

          {/* Form */}
          <div className="rounded-lg border border-line bg-surface p-6 sm:p-8">
            <h2 className="font-display text-2xl font-bold text-navy">
              Send us a message
            </h2>
            <p className="mt-2 text-sm text-slate">
              Fields marked with <span className="text-error">*</span> are required.
            </p>
            <div className="mt-6">
              <ContactForm />
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
