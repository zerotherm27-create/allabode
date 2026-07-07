import { Button } from "@/components/ui";
import { Container } from "@/components/ui";
import { PageHero } from "@/components/sections";
import { ListingsBrowser } from "@/components/listings-browser";
import type { Listing } from "@/lib/data";

type Props = {
  eyebrow: string;
  title: string;
  subtitle: string;
  crumbLabel: string;
  intro?: string;
  cta?: { label: string; href: string };
  listings: Listing[];
  heroImage?: string;
};

/** Shared layout for the /listings/<category> pages: hero + intro + pre-filtered browser. */
export function CategoryListingsPage({
  eyebrow,
  title,
  subtitle,
  crumbLabel,
  intro,
  cta,
  listings,
  heroImage,
}: Props) {
  return (
    <>
      <PageHero
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        image={heroImage}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Listings", href: "/listings" },
          { label: crumbLabel },
        ]}
      >
        {cta && (
          <Button href={cta.href} size="lg" variant="ghost-light">
            {cta.label}
          </Button>
        )}
      </PageHero>

      <section className="py-section">
        <Container>
          {intro && (
            <p className="mx-auto mb-12 max-w-3xl text-center text-slate">
              {intro}
            </p>
          )}
          <ListingsBrowser listings={listings} />
          <p className="mx-auto mt-12 max-w-3xl text-center text-sm text-slate">
            All listings are subject to availability, owner approval, and
            verification at the time of inquiry. Want your property listed
            here?{" "}
            <a
              href="/list-your-property"
              className="text-navy-700 underline underline-offset-2 hover:text-gold-ink"
            >
              List My Property
            </a>
            .
          </p>
        </Container>
      </section>
    </>
  );
}
