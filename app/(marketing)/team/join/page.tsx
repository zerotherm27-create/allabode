import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { PageHero } from "@/components/sections";
import { JoinForm } from "./join-form";

export const metadata: Metadata = {
  title: "Become a property specialist",
  description:
    "Apply to join All Abode as a property specialist and get your own listings page.",
  robots: { index: false, follow: true },
};

export default function JoinPage() {
  return (
    <>
      <PageHero
        eyebrow="Join the team"
        title="Become a property specialist"
        subtitle="Apply for a profile and your own listings page on All Abode. We review every application before it goes live."
        crumbs={[{ label: "Home", href: "/" }, { label: "Join the team" }]}
      />
      <section className="py-section">
        <Container>
          <div className="mx-auto w-full max-w-xl rounded-lg border border-line bg-surface p-6 sm:p-8">
            <JoinForm />
          </div>
        </Container>
      </section>
    </>
  );
}
