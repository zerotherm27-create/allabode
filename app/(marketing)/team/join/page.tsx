import type { Metadata } from "next";
import Link from "next/link";
import { Button, Container } from "@/components/ui";
import { PageHero } from "@/components/sections";

export const metadata: Metadata = {
  title: "Specialist sign-in",
  description: "Property specialists join All Abode by invitation. Check your email for your invitation, then sign in.",
  robots: { index: false, follow: true },
};

export default function JoinPage() {
  return (
    <>
      <PageHero
        eyebrow="Property specialists"
        title="Specialist sign-in"
        crumbs={[{ label: "Home", href: "/" }, { label: "Specialist sign-in" }]}
      />
      <section className="py-section">
        <Container>
          <div className="mx-auto w-full max-w-xl rounded-lg border border-line bg-surface p-6 sm:p-8">
            <p className="text-base text-ink">
              Property specialists join by invitation from All Abode. Check your email for your
              invitation, then sign in.
            </p>
            <div className="mt-6">
              <Button href="/portal/login" size="lg">Sign in</Button>
            </div>
            <p className="mt-6 text-sm text-slate">
              Interested in joining the team?{" "}
              <Link href="/contact" className="inline-flex min-h-11 items-center font-medium text-navy-700 underline-offset-4 hover:underline">
                Contact us
              </Link>
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}
