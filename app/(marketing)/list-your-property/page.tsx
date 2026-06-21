import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PageHero, SectionHeading } from "@/components/sections";
import { ListPropertyForm } from "@/components/forms/lead-forms";

export const metadata: Metadata = {
  title: "List Your Property",
  description:
    "List your property with All Abode Property Solutions for leasing, selling, management, or appraisal. Submit your details and a licensed agent will guide you through the next steps.",
};

const steps = [
  { icon: "edit_document", title: "Submit your details", body: "Tell us about your property and what you'd like to achieve." },
  { icon: "support_agent", title: "We review & advise", body: "A licensed agent reviews your submission and recommends an approach and pricing." },
  { icon: "rocket_launch", title: "Go to market", body: "We prepare, market, and manage your property through to a successful outcome." },
];

export default function ListYourPropertyPage() {
  return (
    <>
      <PageHero
        eyebrow="List Your Property"
        title="Put your property in licensed hands."
        subtitle="Whether you want to lease, sell, have it managed, or appraised — submit your property below and our team will take it from there."
      />

      {/* How it works */}
      <section className="py-section">
        <Container>
          <SectionHeading eyebrow="How It Works" title="Three simple steps" />
          <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden border border-line bg-line md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.title} className="bg-surface p-8">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center bg-navy text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="text-navy-700">
                    <Icon name={s.icon} size={24} />
                  </span>
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold text-navy">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate">{s.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Form */}
      <section className="bg-surface-gray py-section">
        <Container className="max-w-3xl">
          <div className="rounded-lg border border-line bg-surface p-6 sm:p-10">
            <h2 className="font-display text-2xl font-bold text-navy">
              Property details
            </h2>
            <p className="mt-2 text-sm text-slate">
              Fields marked with <span className="text-error">*</span> are required.
              You can share photos and additional documents after we connect.
            </p>
            <div className="mt-7">
              <ListPropertyForm />
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
