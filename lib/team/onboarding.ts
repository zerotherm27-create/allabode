// Pure, import-free (unit tested directly via tests/helpers/load-ts.mjs, which
// cannot resolve imports). Builds the "Getting started" guide for a newly
// invited property specialist from a snapshot of their account.

export type OnboardingSnapshot = {
  photoPath?: string | null;
  tagline?: string | null;
  bio?: string | null;
  areas?: string[] | null;
  specialties?: string[] | null;
  languages?: string[] | null;
  yearsExperience?: number | null;
  /** Any of public phone / Viber / Facebook / LinkedIn / email is set. */
  hasPublicContact?: boolean;
  /** A row exists in specialist_email_settings (they have visited and saved the follow-up page). */
  hasFollowUpSettings?: boolean;
  listingCount?: number;
  submittedOrApprovedListingCount?: number;
  subdomain?: string | null;
  status?: string | null;
};

export type StepState = "done" | "todo" | "optional";

export type OnboardingLink = { label: string; href: string; external?: boolean };

export type OnboardingStep = {
  id: string;
  title: string;
  why: string;
  howLong: string;
  href: string;
  ctaLabel: string;
  state: StepState;
  detail: string[];
  /** Extra links shown next to the main button (for example the live page). */
  links?: OnboardingLink[];
};

export type OnboardingGuide = {
  steps: OnboardingStep[];
  done: number;
  total: number;
  complete: boolean;
  nextStepId: string | null;
};

/** Steps that never count toward the total, whatever their state. */
const OPTIONAL_IDS = ["contact", "leads"];
const ROOT_DOMAIN = "allabodeph.com";

const has = (s: string | null | undefined) => !!s && s.trim().length > 0;
const some = (xs: string[] | null | undefined) => (xs ?? []).some((x) => x.trim().length > 0);

export function buildOnboarding(s: OnboardingSnapshot): OnboardingGuide {
  const subdomain = has(s.subdomain) ? (s.subdomain as string).trim() : null;
  const approved = s.status === "approved";
  const listingCount = Math.max(0, s.listingCount ?? 0);
  const sent = Math.max(0, s.submittedOrApprovedListingCount ?? 0);

  const photoDone = has(s.photoPath);
  const aboutDone = has(s.tagline) && has(s.bio);
  const detailsDone = some(s.areas) && some(s.specialties) && some(s.languages);
  const pageReady = photoDone && aboutDone && detailsDone;

  const liveLinks: OnboardingLink[] = [];
  if (subdomain && approved) {
    liveLinks.push({ label: `${subdomain}.${ROOT_DOMAIN}`, href: `https://${subdomain}.${ROOT_DOMAIN}`, external: true });
    liveLinks.push({ label: `${ROOT_DOMAIN}/team/${subdomain}`, href: `https://${ROOT_DOMAIN}/team/${subdomain}`, external: true });
  }

  const steps: OnboardingStep[] = [
    {
      id: "portrait",
      title: "Add your portrait",
      why: "Clients want to know who they will be dealing with, and a clear photo builds trust right away.",
      howLong: "About 5 minutes",
      href: "/dashboard/specialist/profile",
      ctaLabel: "Add your portrait",
      state: photoDone ? "done" : "todo",
      detail: [
        "Use a portrait (4:5) photo, head and shoulders, in good light.",
        "Choose a plain light background so it matches the other specialists.",
        "You can crop the photo before you save it.",
      ],
    },
    {
      id: "about",
      title: "Write your tagline and About text",
      why: "These two pieces of text introduce you and tell visitors how you can help.",
      howLong: "About 10 minutes",
      href: "/dashboard/specialist/profile",
      ctaLabel: "Write your introduction",
      state: aboutDone ? "done" : "todo",
      detail: [
        "The tagline is one short line that appears under your name.",
        "Press the Use suggested text buttons for a ready-made starting point, then change it freely so it sounds like you.",
        "Add your areas, specialties and languages first and the suggestions will use them.",
      ],
    },
    {
      id: "details",
      title: "Add your areas, specialties, languages and years of experience",
      why: "These details help the right clients recognise that you are the right person for them.",
      howLong: "About 5 minutes",
      href: "/dashboard/specialist/profile",
      ctaLabel: "Add your details",
      state: detailsDone ? "done" : "todo",
      detail: [
        "List the places you cover, the kinds of property you work with, and the languages you speak.",
        "Separate each item with a comma.",
        "Years of experience is optional. Only enter a number you are happy to show publicly.",
      ],
    },
    {
      id: "contact",
      title: "Add your public contact details",
      why: "Visitors can reach you directly when you share a way to contact you.",
      howLong: "About 3 minutes",
      href: "/dashboard/specialist/profile",
      ctaLabel: "Add contact details",
      state: s.hasPublicContact ? "done" : "optional",
      detail: [
        "This is your choice. You can share a mobile number, Viber, Facebook, LinkedIn or a public email.",
        "Anything you leave blank is not shown, and the page uses All Abode's company details instead.",
        "If you do not want a Call me link on your page, you can switch it off in the same form.",
      ],
    },
    {
      id: "follow-ups",
      title: "Review your follow-up emails",
      why: "When someone contacts you, they receive friendly automatic emails, and it helps to know what they say.",
      howLong: "About 10 minutes",
      href: "/dashboard/specialist/follow-ups",
      ctaLabel: "Review follow-up emails",
      state: s.hasFollowUpSettings ? "done" : "todo",
      detail: [
        "Read each email, and switch the whole set or single emails on or off.",
        "Add a short personal note, and optionally write your own version of an email.",
        "Replies go to your own email address, so you can answer people directly.",
      ],
    },
    {
      id: "listing",
      title: "Add your first listing",
      why: "Listings show clients what you can offer, and they appear with your name on them once approved.",
      howLong: "About 20 minutes",
      href: sent > 0 || listingCount > 0 ? "/dashboard/specialist/listings" : "/dashboard/specialist/listings/new",
      ctaLabel: listingCount > 0 && sent === 0 ? "Finish and submit your listing" : sent > 0 ? "View your listings" : "Create a listing",
      state: sent > 0 ? "done" : "todo",
      detail: [
        "Start a listing as a draft and add the details and photos at your own pace.",
        "When you are ready, submit it for approval. All Abode reviews it before it goes live.",
        "Once the owner approves it, it appears on the site with a Listed by line showing your name.",
      ],
    },
    {
      id: "share",
      title: "Preview and share your page",
      why: "Your page has its own web address, so you can send it to clients and add it to your social profiles.",
      howLong: "About 2 minutes",
      href: liveLinks.length ? liveLinks[0].href : "/dashboard/specialist/profile",
      ctaLabel: liveLinks.length ? "Open your page" : "Review your profile",
      state: pageReady && subdomain ? "done" : "todo",
      detail: [
        subdomain
          ? `Your page is at ${subdomain}.${ROOT_DOMAIN}, and also at ${ROOT_DOMAIN}/team/${subdomain}.`
          : "Your web address will appear here once it has been set up.",
        "After you save changes to your profile, it can take a few minutes before the public page shows them.",
        pageReady
          ? "Your portrait, introduction and details are in place, so your page is ready to share."
          : "Finish the first three steps so the page looks complete before you share it.",
      ],
      links: liveLinks.length ? liveLinks : undefined,
    },
    {
      id: "leads",
      title: "Handle your leads",
      why: "Every person who contacts you lands in your Leads inbox, and a quick reply makes a big difference.",
      howLong: "A few minutes each day",
      href: "/dashboard/specialist/leads",
      ctaLabel: "Open your leads",
      state: "optional",
      detail: [
        "Open a lead to see their message and contact details.",
        "Move each lead along the stages as you follow up, from New to Contacted and beyond.",
        "Automatic emails stop once a lead reaches Viewing, Negotiating, Closed or Lost, so you can take over personally.",
      ],
    },
  ];

  const counted = steps.filter((st) => !OPTIONAL_IDS.includes(st.id));
  const total = counted.length;
  const done = counted.filter((st) => st.state === "done").length;
  const next = steps.find((st) => st.state === "todo");

  return { steps, done, total, complete: done === total, nextStepId: next ? next.id : null };
}
