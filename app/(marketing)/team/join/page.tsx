import type { Metadata } from "next";
import Link from "next/link";
import { Button, Container } from "@/components/ui";
import { PageHero } from "@/components/sections";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";

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
            <div className="my-6 flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-line" />
              <span className="text-sm text-slate">or</span>
              <span className="h-px flex-1 bg-line" />
            </div>
            <GoogleAuthButton next="/portal" label="Continue with Google" />
            <p className="mt-3 text-sm text-slate">
              Invited with a Gmail address? Use Google with the same email.
            </p>
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
