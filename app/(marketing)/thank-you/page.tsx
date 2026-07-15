import type { Metadata } from "next";
import { Container, Button } from "@/components/ui";
import { Icon } from "@/components/icon";

const title = "Thank You | All Abode Property Solutions";
const description =
  "Your inquiry has been received. The All Abode team will review your details and get back to you.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/thank-you" },
  openGraph: { title, description },
  robots: { index: false, follow: true },
};

export default function ThankYouPage() {
  return (
    <section className="pb-section-lg pt-32 md:pt-36">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-available/10 text-available">
            <Icon name="check_circle" size={48} fill={1} />
          </span>
          <h1 className="mt-8 font-display text-3xl font-bold text-navy sm:text-4xl">
            Thank you for contacting All Abode
          </h1>
          <p className="mt-5 text-lg text-slate">
            Your inquiry has been received. The All Abode team will review your
            details and get back to you through your provided contact information.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Button href="/" size="lg">
              Return to Home
            </Button>
            <Button href="/listings" variant="ghost" size="lg">
              View Listings
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
