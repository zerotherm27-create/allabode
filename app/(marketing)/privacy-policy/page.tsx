import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { PageHero } from "@/components/sections";
import { getSettings, s } from "@/lib/settings";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy | All Abode",
  description:
    "Read the All Abode Privacy Policy for information about how personal data is collected, used, stored, and protected.",
  alternates: { canonical: "/privacy-policy" },
};

export default async function PrivacyPolicyPage() {
  const settings = await getSettings();
  const email = s(settings, "contact_email") || site.email;
  const phone = s(settings, "contact_phone") || site.phone;

  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Privacy Policy"
        subtitle="All Abode respects your privacy and is committed to protecting the personal information you share with us."
        crumbs={[{ label: "Home", href: "/" }, { label: "Privacy Policy" }]}
      />

      <section className="py-section">
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
                <a href={`mailto:${email}`} className="text-navy-700 underline underline-offset-2 hover:text-gold">
                  {email}
                </a>
                <br />
                Mobile: {phone}
              </p>
            </div>

          </div>
        </Container>
      </section>
    </>
  );
}
