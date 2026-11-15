import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Help guide", robots: { index: false } };

type Topic = {
  id: string;
  icon: string;
  title: string;
  intro: string;
  /** What to do, in order. */
  steps: string[];
  /** Rules and behaviour worth knowing. */
  notes: string[];
  href: string;
  cta: string;
};

const TOPICS: Topic[] = [
  {
    id: "profile",
    icon: "person",
    title: "Your profile and public page",
    intro:
      "Your profile is what clients see on your public page: your portrait, your introduction, the areas you cover and how to reach you.",
    steps: [
      "Open Profile and upload a portrait photo. You can crop it before you save.",
      "Fill in your tagline, About headline and About text. The Use suggested text buttons give you a starting point you can rewrite.",
      "Add the areas you cover, your specialties and the languages you speak, separated by commas.",
      "Add any public contact details you want to share: mobile, Viber, Facebook, LinkedIn or a public email.",
      "Pick a page layout, use Preview to see it, then press Save.",
      "Go to Overview and press Publish my page when you are happy with it.",
    ],
    notes: [
      "Saved changes go live right away, though the public page can take a few minutes to show them.",
      "The Phone field in your details is private. Only All Abode sees it. Clients only see what you enter under Public contact details.",
      "Any public contact field you leave blank is not shown, and your page uses All Abode's company details instead.",
      "Your accreditation line is set by All Abode and cannot be edited here.",
      "You can unpublish your page from Overview at any time. While it is unpublished, your listings show as All Abode listings.",
    ],
    href: "/dashboard/specialist/profile",
    cta: "Open Profile",
  },
  {
    id: "listings",
    icon: "home_work",
    title: "Listings",
    intro:
      "Add the properties you are handling. Each one is reviewed by All Abode before it appears on the website with your name on it.",
    steps: [
      "Open My listings and press Add listing.",
      "Fill in the property details and press Save draft. Only you can see a draft.",
      "Add photos. This becomes available once the draft is saved.",
      "Press Submit for approval when the listing is complete.",
      "Watch the Review column in My listings. Once it is approved, the listing is live with a Listed by line showing your name.",
    ],
    notes: [
      "You can keep editing a listing while All Abode is reviewing it.",
      "If a listing needs changes, the reason is shown under it in My listings. Update it, then submit it again.",
      "Edits to a live listing go live straight away, so check prices and details before you save.",
      "A draft can be deleted. A listing that has been live cannot: open it and set its status to Archived instead.",
    ],
    href: "/dashboard/specialist/listings",
    cta: "Open My listings",
  },
  {
    id: "leads",
    icon: "forum",
    title: "Leads",
    intro:
      "Everyone who contacts you through your page or one of your listings lands in your Leads inbox. A quick personal reply makes the biggest difference.",
    steps: [
      "Open Leads. New enquiries are at the top and marked New.",
      "Open a lead to read the message, see which listing it came from, and tap the email or phone number to reply.",
      "After you have replied, change the stage to Contacted and press Update stage.",
      "Keep the stage current as things progress: Viewing, Negotiating, then Closed or Lost.",
      "Use Private notes to record what was discussed and what to do next.",
    ],
    notes: [
      "Use the stage tabs to see only one stage, or search by name or email.",
      "Private notes are visible only to you and All Abode staff, never to the client.",
      "Email history on each lead shows which automatic emails were sent, are due, or were skipped.",
      "The label under Contact tells you whether the person agreed to follow-up emails or has unsubscribed.",
    ],
    href: "/dashboard/specialist/leads",
    cta: "Open Leads",
  },
  {
    id: "follow-ups",
    icon: "mail",
    title: "Follow-up emails",
    intro:
      "When someone contacts you and agrees to follow-up emails, All Abode sends them a short series of friendly emails on your behalf, so no enquiry goes cold.",
    steps: [
      "Open Follow-up emails and press Preview on each email to read what it says and when it is sent.",
      "Switch off any single email you do not want sent, or use the main switch to turn the whole series on or off.",
      "Add a personal note, for example the days you are free for viewings. It appears in the emails that include it.",
      "Use Edit my version if you would rather send an email in your own words.",
      "Press Send me a test email to see exactly what a client receives.",
    ],
    notes: [
      "Emails go out under your name via All Abode, and replies come straight to your login email address.",
      "Only people who ticked the consent box when they enquired receive these emails.",
      "The emails stop on their own once a lead reaches Viewing, Negotiating, Closed or Lost, or the person unsubscribes. That is why keeping the lead stage current matters.",
      "Every email includes an unsubscribe link.",
    ],
    href: "/dashboard/specialist/follow-ups",
    cta: "Open Follow-up emails",
  },
  {
    id: "sharing",
    icon: "share",
    title: "Sharing your page",
    intro:
      "Once your page is published it has its own web address that you can send to clients and add to your social profiles.",
    steps: [
      "Open Overview and check that it says your page is live.",
      "Press View my page to see it the way a client does.",
      "Copy the web address from your browser and share it by message, email or on your social profiles.",
    ],
    notes: [
      "Getting started lists your web addresses once your page has been set up.",
      "Enquiries sent from your page and your listings come to your Leads inbox automatically.",
    ],
    href: "/dashboard/specialist",
    cta: "Open Overview",
  },
];

const ROUTINE = [
  "Check Leads for anything marked New and reply the same day.",
  "Update the stage of each lead you spoke to and add a short note.",
  "Check My listings for anything that needs changes, and archive listings that are no longer available.",
];

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700";

export default function SpecialistGuidePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-bold text-navy">Help guide</h1>
      <p className="mt-1 text-sm text-slate">
        How to use each part of your dashboard. If you are setting up for the first time, follow{" "}
        <Link href="/dashboard/specialist/getting-started" className={`font-medium text-navy-700 underline ${focus}`}>
          Getting started
        </Link>{" "}
        first, then come back here whenever you need a reminder.
      </p>

      <nav aria-label="Guide topics" className="mt-6 rounded-lg border border-line bg-surface p-3">
        <ul className="grid gap-1 sm:grid-cols-2">
          {TOPICS.map((t) => (
            <li key={t.id}>
              <a
                href={`#${t.id}`}
                className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-navy transition-colors hover:bg-surface-gray ${focus}`}
              >
                <Icon name={t.icon} size={18} className="shrink-0 text-navy-700" />
                {t.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <section aria-labelledby="routine-heading" className="mt-6 rounded-lg border border-gold/40 bg-cream p-5">
        <h2 id="routine-heading" className="font-display text-base font-semibold text-navy">
          A simple daily routine
        </h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm text-ink">
          {ROUTINE.map((r) => (
            <li key={r} className="flex gap-2">
              <Icon name="check_circle" size={18} className="mt-0.5 shrink-0 text-navy-700" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-6 flex flex-col gap-6">
        {TOPICS.map((t) => (
          <section
            key={t.id}
            id={t.id}
            aria-labelledby={`${t.id}-heading`}
            className="scroll-mt-20 rounded-lg border border-line bg-surface p-5 md:p-6"
          >
            <div className="flex items-start gap-4">
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-md bg-navy/5 text-navy-700"
              >
                <Icon name={t.icon} size={20} />
              </span>
              <div className="min-w-0">
                <h2 id={`${t.id}-heading`} className="font-display text-lg font-semibold text-navy">
                  {t.title}
                </h2>
                <p className="mt-1 text-sm text-ink">{t.intro}</p>
              </div>
            </div>

            <h3 className="label-caps mt-5 text-slate">How to do it</h3>
            <ol className="mt-2 flex list-decimal flex-col gap-2 pl-5 text-sm text-ink marker:font-semibold marker:text-navy">
              {t.steps.map((s) => (
                <li key={s} className="pl-1">
                  {s}
                </li>
              ))}
            </ol>

            <h3 className="label-caps mt-5 text-slate">Good to know</h3>
            <ul className="mt-2 flex list-disc flex-col gap-2 pl-5 text-sm text-slate">
              {t.notes.map((n) => (
                <li key={n} className="pl-1">
                  {n}
                </li>
              ))}
            </ul>

            <Link
              href={t.href}
              className={`mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-navy px-5 text-sm font-semibold text-white transition-colors hover:bg-navy-700 ${focus}`}
            >
              {t.cta}
              <Icon name="arrow_forward" size={18} />
            </Link>
          </section>
        ))}
      </div>

      <p className="mt-6 text-sm text-slate">
        Still stuck, or something not working as described? Contact{" "}
        <a href={site.emailHref} className={`font-medium text-navy-700 underline ${focus}`}>
          All Abode
        </a>{" "}
        and we will help.
      </p>
    </div>
  );
}
