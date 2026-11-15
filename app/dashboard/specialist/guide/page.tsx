import type { Metadata } from "next";
import Link from "next/link";
import { HelpGuide, type GuideTopic } from "@/components/dashboard/help-guide";

export const metadata: Metadata = { title: "Help guide", robots: { index: false } };

const TOPICS: GuideTopic[] = [
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
    <HelpGuide
      intro={
        <>
          How to use each part of your dashboard. If you are setting up for the first time, follow{" "}
          <Link href="/dashboard/specialist/getting-started" className={`font-medium text-navy-700 underline ${focus}`}>
            Getting started
          </Link>{" "}
          first, then come back here whenever you need a reminder.
        </>
      }
      routineTitle="A simple daily routine"
      routine={ROUTINE}
      topics={TOPICS}
    />
  );
}
