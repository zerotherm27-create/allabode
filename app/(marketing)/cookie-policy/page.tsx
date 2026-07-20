import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { PageHero } from "@/components/sections";
import { getSettings, s } from "@/lib/settings";
import { site } from "@/lib/site";

const title = "Cookie Policy | All Abode";
const description =
  "Read the All Abode Cookie Policy for information about the cookies this website uses and how to manage them.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/cookie-policy" },
  openGraph: { title, description },
};

export default async function CookiePolicyPage() {
  const settings = await getSettings();
  const email = s(settings, "contact_email") || site.email;
  const phone = s(settings, "contact_phone") || site.phone;

  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Cookie Policy"
        subtitle="This page explains what cookies this website uses, why, and how you can manage them."
        image={s(settings, "page_cookie_image") || undefined}
        imagePosition={s(settings, "page_cookie_image_position")}
        crumbs={[{ label: "Home", href: "/" }, { label: "Cookie Policy" }]}
      />

      <section className="py-section">
        <Container>
          <div className="mx-auto max-w-3xl space-y-10 text-slate leading-relaxed">

            <p>
              This Cookie Policy explains how All Abode, operated by All Abode
              Brokerage and Valuation OPC, uses cookies on this website. It
              should be read together with our{" "}
              <a href="/privacy-policy" className="text-navy-700 underline underline-offset-2 hover:text-gold-ink">
                Privacy Policy
              </a>.
            </p>

            <div>
              <h2 className="font-display text-xl font-bold text-navy">
                What Are Cookies
              </h2>
              <p className="mt-3">
                Cookies are small text files stored on your device by your
                browser when you visit a website. They let a site recognize
                your device on later visits or across pages of the same
                session.
              </p>
            </div>

            <div>
              <h2 className="font-display text-xl font-bold text-navy">
                Cookies We Use
              </h2>
              <ul className="mt-3 list-disc space-y-1.5 pl-6">
                <li>
                  <span className="font-medium text-navy">
                    Essential / authentication cookies
                  </span>{" "}
                  — set when you sign in to the owner, tenant, or staff portal.
                  These keep you signed in as you move between pages and are
                  required for the portal and admin dashboard to work. They
                  are cleared when you sign out or your session expires. These
                  are always on and are not affected by the cookie banner.
                </li>
                <li>
                  <span className="font-medium text-navy">
                    Analytics cookies (Google Analytics, Meta Pixel)
                  </span>{" "}
                  — help us understand how visitors use the site (pages
                  viewed, general traffic patterns) so we can improve it. These
                  only load if you accept cookies in the banner shown on your
                  first visit; if you decline, they are never set.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-xl font-bold text-navy">
                Managing Cookies
              </h2>
              <p className="mt-3">
                On your first visit, a banner lets you accept or decline
                cookies; your choice is remembered on your device so the
                banner won&apos;t show again. Declining blocks Google
                Analytics and Meta Pixel from loading — it does not affect
                your ability to browse listings, submit inquiries, or sign in
                to a portal, since the sign-in cookie is essential and always
                on. Most browsers also let you block or delete cookies
                through their own settings at any time.
              </p>
            </div>

            <div>
              <h2 className="font-display text-xl font-bold text-navy">
                Changes to This Policy
              </h2>
              <p className="mt-3">
                If we introduce additional non-essential cookies in the
                future, we will update this page to describe them before they
                are used.
              </p>
            </div>

            <div>
              <h2 className="font-display text-xl font-bold text-navy">
                Contact
              </h2>
              <p className="mt-3">For questions about this Cookie Policy, contact:</p>
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
