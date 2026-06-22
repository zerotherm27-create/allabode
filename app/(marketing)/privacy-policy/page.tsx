import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { PageHero } from "@/components/sections";

export const metadata: Metadata = {
  title: "Privacy Policy | All Abode Property Solutions",
  description:
    "Learn how All Abode Property Solutions collects, uses, and protects the information you submit through our website forms.",
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Privacy Policy"
        subtitle="How All Abode Property Solutions collects and uses information submitted through this website."
      />

      <section className="py-section">
        <Container>
          <div className="mx-auto max-w-3xl space-y-10 text-slate leading-relaxed">

            <div>
              <h2 className="font-display text-xl font-bold text-navy">
                What information we collect
              </h2>
              <p className="mt-3">
                All Abode Property Solutions collects information submitted through
                website forms, including name, email address, mobile number, property
                details, and the nature of your inquiry or request.
              </p>
            </div>

            <div>
              <h2 className="font-display text-xl font-bold text-navy">
                How we use your information
              </h2>
              <p className="mt-3">
                Information submitted through this website is used to respond to
                inquiries, coordinate property services, manage listing requests,
                process appraisal requests, and handle related client communication.
                Personal information is used only for legitimate service communication
                and operational purposes.
              </p>
            </div>

            <div>
              <h2 className="font-display text-xl font-bold text-navy">
                Data retention
              </h2>
              <p className="mt-3">
                Inquiry records are retained as part of our client management process.
                You may contact us to request access to, correction of, or deletion of
                your submitted information.
              </p>
            </div>

            <div>
              <h2 className="font-display text-xl font-bold text-navy">
                Sharing your information
              </h2>
              <p className="mt-3">
                Your information will not be sold to third parties. All Abode Property
                Solutions does not share personal information with unrelated parties
                except where required to provide the service you requested or as required
                by applicable law.
              </p>
            </div>

            <div>
              <h2 className="font-display text-xl font-bold text-navy">
                Form consent notice
              </h2>
              <p className="mt-3">
                By submitting any form on this website, you agree that All Abode Property
                Solutions may collect and use your submitted information to respond to
                your inquiry, coordinate property services, and manage related
                communication. Your information will not be sold.
              </p>
            </div>

            <div>
              <h2 className="font-display text-xl font-bold text-navy">
                Contact us
              </h2>
              <p className="mt-3">
                If you have questions about how your information is handled, please
                contact All Abode Property Solutions through the{" "}
                <a href="/contact" className="text-navy-700 underline underline-offset-2 hover:text-gold">
                  Contact page
                </a>
                .
              </p>
            </div>

            <div className="rounded-md border border-line bg-surface-gray p-5 text-sm text-slate">
              <strong className="text-navy">Note:</strong> A full legal privacy policy
              compliant with the Philippine Data Privacy Act of 2012 (Republic Act 10173)
              and other applicable regulations should be prepared and reviewed by a qualified
              legal professional before launch. This page is a summary placeholder.
            </div>

          </div>
        </Container>
      </section>
    </>
  );
}
