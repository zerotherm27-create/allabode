import type { Metadata } from "next";
import { Container, Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Page Not Found | All Abode Property Solutions",
};

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="pb-section-lg pt-32 md:pt-36">
          <Container>
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-surface-gray text-slate">
                <Icon name="search_off" size={48} />
              </span>
              <h1 className="mt-8 font-display text-3xl font-bold text-navy sm:text-4xl">
                Page not found
              </h1>
              <p className="mt-5 text-lg text-slate">
                The page you are looking for may have moved, been removed, or is
                temporarily unavailable.
              </p>
              <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
                <Button href="/" size="lg">
                  Go to Homepage
                </Button>
                <Button href="/listings" variant="ghost" size="lg">
                  View Listings
                </Button>
                <Button href="/contact" variant="ghost" size="lg">
                  Contact All Abode
                </Button>
              </div>
            </div>
          </Container>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
