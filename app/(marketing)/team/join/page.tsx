import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { PageHero } from "@/components/sections";
import { JoinForm } from "./join-form";

export const metadata: Metadata = {
  title: "Activate your specialist account",
  description:
    "For property specialists invited by All Abode: activate your account with the email address you gave us.",
  robots: { index: false, follow: true },
};

export default function JoinPage() {
  return (
    <>
      <PageHero
        eyebrow="Property specialists"
        title="Activate your specialist account"
        subtitle="For property specialists invited by All Abode. Sign up with the same email address you gave us, confirm it, and your account opens."
        crumbs={[{ label: "Home", href: "/" }, { label: "Activate account" }]}
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
