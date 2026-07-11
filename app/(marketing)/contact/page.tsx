import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PageHero, SectionHeading } from "@/components/sections";
import { ContactForm } from "@/components/forms/lead-forms";
import { getSettings, s } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Contact All Abode Property Solutions",
  description:
    "Contact All Abode for brokerage, leasing, valuation, property management, listings, and documentation assistance.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const settings = await getSettings();
  const phone = s(settings, "contact_phone");
  const email = s(settings, "contact_email");
  const location = s(settings, "contact_location");
  const serviceArea = s(settings, "contact_service_area");
  const messenger = s(settings, "social_messenger");
  const whatsapp = s(settings, "social_whatsapp");
  const viber = s(settings, "social_viber");
  const phoneHref = `tel:${phone.replace(/[^\d+]/g, "")}`;
  const emailHref = `mailto:${email}`;

  const channels = [
    { icon: "call", label: "Phone", value: phone, href: phoneHref },
    { icon: "mail", label: "Email", value: email, href: emailHref },
    { icon: "forum", label: "Facebook / Messenger", value: "Message us on Messenger", href: messenger },
    { icon: "chat", label: "WhatsApp", value: phone, href: whatsapp },
    { icon: "sms", label: "Viber", value: phone, href: viber },
    { icon: "location_on", label: "Office", value: location, href: undefined },
  ];

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Contact All Abode"
        subtitle="Tell us what you need help with and our team will guide you to the right property solution. You may contact All Abode for property listings, leasing, sale, valuation, management, documentation assistance, and general real estate concerns."
        image={s(settings, "page_contact_image") || undefined}
        crumbs={[{ label: "Home", href: "/" }, { label: "Contact" }]}
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
              <p className="mt-2 text-navy">{serviceArea}</p>
            </div>

            {location && (
              <div className="mt-6 aspect-[16/10] overflow-hidden rounded-lg border border-line">
                <iframe
                  src={`https://www.google.com/maps?q=${encodeURIComponent(location)}&output=embed`}
                  className="h-full w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`Map showing ${location}`}
                />
              </div>
            )}
          </div>

          {/* Form */}
          <div className="rounded-lg border border-line bg-surface p-6 sm:p-8">
            <h2 className="font-display text-2xl font-bold text-navy">
              Send us a message
            </h2>
            <p className="mt-2 text-sm text-slate">
              For faster assistance, please include the property location,
              property type, and the service you need. Fields marked with{" "}
              <span className="text-error">*</span> are required.
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
