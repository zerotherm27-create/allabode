import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { PageHero } from "@/components/sections";
import { Reveal } from "@/components/motion";
import { getSettings, s } from "@/lib/settings";
import { site } from "@/lib/site";
import { JsonLd, breadcrumbSchema } from "@/components/seo/json-ld";

const title = "Privacy Policy | All Abode";
const description =
  "Read the All Abode Privacy Policy for information about how personal data is collected, used, stored, and protected.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/privacy-policy" },
  openGraph: { title, description },
};

export default async function PrivacyPolicyPage() {
  const settings = await getSettings();
  const email = s(settings, "contact_email") || site.email;
  const phone = s(settings, "contact_phone") || site.phone;

  return (
    <>
      <JsonLd data={breadcrumbSchema([{ label: "Home", href: "/" }, { label: "Privacy Policy" }])} />
      <PageHero
        eyebrow="Legal"
        title="Privacy Policy"
        subtitle="All Abode respects your privacy and is committed to protecting the personal information you share with us."
        image={s(settings, "page_privacy_image") || undefined}
        imagePosition={s(settings, "page_privacy_image_position")}
        crumbs={[{ label: "Home", href: "/" }, { label: "Privacy Policy" }]}
      />

      <Reveal as="section" className="py-section">
        <Container>
          <div className="mx-auto max-w-3xl space-y-10 text-slate leading-relaxed">

            <p>
              This Privacy Policy explains how All Abode, operated by All Abode
              Brokerage and Valuation OPC, collects, uses, stores, and protects
              personal information through our website, inquiry forms,
              communications, and services.
            </p>

            <div>
              <h2 className="font-display text-xl font-bold text-navy">
                Information We Collect
              </h2>
              <p className="mt-3">
                We may collect personal information such as your name, email
                address, mobile number, property details, inquiry details,
                identification documents, transaction documents, billing
                information, and other information needed to respond to your
                inquiry or provide our services.
              </p>
            </div>

            <div>
              <h2 className="font-display text-xl font-bold text-navy">
                How We Use Your Information
              </h2>
              <p className="mt-3">We may use your information to:</p>
              <ul className="mt-3 list-disc space-y-1.5 pl-6">
                <li>Respond to your inquiries</li>
                <li>Coordinate property viewings</li>
                <li>Assist with brokerage, leasing, valuation, property management, and documentation services</li>
                <li>Verify property or client information</li>
                <li>Coordinate with property owners, tenants, buyers, sellers, building administrators, service providers, and relevant offices</li>
                <li>Prepare documents and service records</li>
                <li>Comply with legal, regulatory, and professional requirements</li>
                <li>Improve our services and website experience</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-xl font-bold text-navy">
                Data Sharing
              </h2>
              <p className="mt-3">
                We may share necessary information with property owners,
                tenants, buyers, sellers, building administrators, service
                providers, government offices, licensed professionals, and other
                parties involved in the service you requested.
              </p>
              <p className="mt-3">
                We only share information when needed for the service,
                transaction, compliance requirement, or with your consent.
              </p>
            </div>

            <div>
              <h2 className="font-display text-xl font-bold text-navy">
                Follow-up Emails About Your Inquiry
              </h2>
              <p className="mt-3">
                When you submit an inquiry and tick the consent box, you also
                agree to receive a short series of follow-up emails about that
                inquiry. They are sent on behalf of the property specialist
                handling your inquiry, or by All Abode, from our sending
                address at mail.allabodeph.com, and your replies go to that
                specialist. We send them only if your inquiry has been assigned
                to a property specialist, and only about the property or
                service you asked about.
              </p>
              <p className="mt-3">
                Our legal basis is your consent, which you give by ticking the
                box on the form. You can withdraw it at any time: every email
                has an unsubscribe link, and using it stops further follow-up
                emails to that email address. You can also write to us at the
                contact details below. Unsubscribing does not affect replies to
                your inquiry or messages you send us directly.
              </p>
              <p className="mt-3">
                We keep a record of your consent and of the follow-up emails
                sent to you, together with your inquiry, for as long as needed
                to handle your inquiry and keep our professional records (see
                Data Retention). If you unsubscribe, we keep your email address
                on a do-not-email list so we do not contact you again.
              </p>
            </div>

            <div>
              <h2 className="font-display text-xl font-bold text-navy">
                Website Analytics
              </h2>
              <p className="mt-3">
                We collect anonymous, session-based usage data about visits to
                our website — pages viewed, approximate location derived from
                your IP address (without storing the IP address itself),
                device type, operating system, browser, referring site, and
                session duration. This is gathered through our own systems,
                not a third-party analytics service, using a single session
                cookie that expires after a period of inactivity and is only
                set if you accept cookies in the banner shown on your first
                visit (see our{" "}
                <a href="/cookie-policy" className="text-navy-700 underline underline-offset-2 hover:text-gold-ink">
                  Cookie Policy
                </a>
                ). This data is used only to understand and improve website
                performance and content, and is not linked to your identity
                unless you separately identify yourself, such as by
                submitting an inquiry or booking form.
              </p>
            </div>

            <div>
              <h2 className="font-display text-xl font-bold text-navy">
                Data Protection
              </h2>
              <p className="mt-3">
                We take reasonable steps to protect personal information against
                unauthorized access, loss, misuse, alteration, or disclosure.
              </p>
            </div>

            <div>
              <h2 className="font-display text-xl font-bold text-navy">
                Data Retention
              </h2>
              <p className="mt-3">
                We retain personal information only as long as necessary for
                service delivery, legal compliance, professional records,
                dispute resolution, and legitimate business purposes.
              </p>
            </div>

            <div>
              <h2 className="font-display text-xl font-bold text-navy">
                Your Rights
              </h2>
              <p className="mt-3">
                You may request access, correction, or deletion of your personal
                information, subject to legal and operational limitations.
              </p>
            </div>

            <div>
              <h2 className="font-display text-xl font-bold text-navy">
                Contact
              </h2>
              <p className="mt-3">For privacy concerns, contact:</p>
              <p className="mt-3">
                All Abode Brokerage and Valuation OPC
                <br />
                Email:{" "}
                <a href={`mailto:${email}`} className="text-navy-700 underline underline-offset-2 hover:text-gold-ink">
                  {email}
                </a>
                <br />
                Mobile: {phone}
              </p>
            </div>

          </div>
        </Container>
      </Reveal>
    </>
  );
}
