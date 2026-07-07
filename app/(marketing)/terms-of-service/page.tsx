import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { PageHero } from "@/components/sections";
import { getSettings, s } from "@/lib/settings";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service | All Abode",
  description:
    "Read the All Abode Terms of Service for website use, listings, inquiries, and property-related service limitations.",
  alternates: { canonical: "/terms-of-service" },
};

export default async function TermsOfServicePage() {
  const settings = await getSettings();
  const email = s(settings, "contact_email") || site.email;
  const phone = s(settings, "contact_phone") || site.phone;

  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Terms of Service"
        subtitle="These Terms of Service apply to the use of the All Abode website and services. By using this website or submitting an inquiry, you agree to these terms."
        crumbs={[{ label: "Home", href: "/" }, { label: "Terms of Service" }]}
      />

      <section className="py-section">
        <Container>
          <div className="mx-auto max-w-3xl space-y-10 text-slate leading-relaxed">

            <div>
              <h2 className="font-display text-xl font-bold text-navy">
                Website Information
              </h2>
              <p className="mt-3">
                The information on this website is provided for general
                information and service inquiry purposes. Property details,
                prices, availability, terms, and conditions are subject to
                verification and may change without prior notice.
              </p>
            </div>

            <div>
              <h2 className="font-display text-xl font-bold text-navy">
                Listings
              </h2>
              <p className="mt-3">
                Listings are subject to owner approval, availability, building
                rules, document verification, and final agreement between the
                relevant parties.
              </p>
              <p className="mt-3">
                All Abode does not guarantee that a listing remains available at
                the time of inquiry.
              </p>
            </div>

            <div>
              <h2 className="font-display text-xl font-bold text-navy">
                Services
              </h2>
              <p className="mt-3">
                All Abode provides brokerage, valuation, leasing, property
                management, and documentation assistance through All Abode
                Brokerage and Valuation OPC.
              </p>
              <p className="mt-3">
                Brokerage and valuation services are performed under the
                supervision of duly licensed real estate service practitioners.
              </p>
              <p className="mt-3">
                Documentation assistance is administrative coordination and
                processing support. Legal advice, tax advice, and notarial acts
                are provided only by duly authorized professionals when required.
              </p>
            </div>

            <div>
              <h2 className="font-display text-xl font-bold text-navy">
                User Responsibilities
              </h2>
              <p className="mt-3">
                Users are responsible for providing accurate information, valid
                documents, and timely responses when requesting services.
              </p>
            </div>

            <div>
              <h2 className="font-display text-xl font-bold text-navy">
                No Automatic Engagement
              </h2>
              <p className="mt-3">
                Submitting an inquiry through the website does not automatically
                create a client relationship, agency relationship, brokerage
                engagement, appraisal engagement, or property management
                agreement.
              </p>
              <p className="mt-3">
                A formal engagement may require written agreement,
                authorization, service terms, and acceptance by All Abode.
              </p>
            </div>

            <div>
              <h2 className="font-display text-xl font-bold text-navy">
                Limitation
              </h2>
              <p className="mt-3">
                All Abode will take reasonable steps to provide accurate and
                helpful information, but website content should not be treated
                as legal, tax, financial, or investment advice.
              </p>
            </div>

            <div>
              <h2 className="font-display text-xl font-bold text-navy">
                Contact
              </h2>
              <p className="mt-3">For questions about these terms, contact:</p>
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
      </section>
    </>
  );
}
