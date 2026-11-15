import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/shell";
import { HelpGuide, type GuideTopic } from "@/components/dashboard/help-guide";
import { ownerNav } from "@/lib/dashboard/nav";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole, homeForRole } from "@/lib/auth/role";

export const metadata: Metadata = { title: "Help guide", robots: { index: false } };

const TOPICS: GuideTopic[] = [
  {
    id: "portfolio",
    icon: "apartment",
    title: "Your dashboard and properties",
    intro:
      "The dashboard is a summary of everything All Abode manages for you: your properties, their units and how many are occupied.",
    steps: [
      "Open Dashboard to see your number of properties and units, your occupancy and your latest net remittance.",
      "Choose Properties in the menu to jump to your property list.",
      "Look under each property to see its units.",
    ],
    notes: [
      "Properties and units are added and updated by your property manager. You cannot edit them here.",
      "If a property or unit is missing or looks wrong, contact All Abode so we can correct it.",
    ],
    href: "/dashboard/owner#properties",
    cta: "Open Properties",
  },
  {
    id: "statements",
    icon: "receipt_long",
    title: "Statements and expenses",
    intro:
      "Each statement of account shows the income collected, the deductions made and the net amount for one period.",
    steps: [
      "Choose Statements in the menu to jump to your statements.",
      "Use the month and year filters to find a period, and Clear to see them all again.",
      "Open a statement to see its income and deductions line by line.",
      "Press Download to save a PDF copy for your records.",
      "Choose Expenses in the menu to see the most recent expenses posted against your properties.",
    ],
    notes: [
      "A statement appears here once All Abode has reviewed and published it.",
      "The Latest Net Remittance figure on your dashboard comes from your most recent statement.",
      "If you have a question about a line on a statement, contact All Abode and mention the period.",
    ],
    href: "/dashboard/owner#statements",
    cta: "Open Statements",
  },
  {
    id: "invoices",
    icon: "request_quote",
    title: "Invoices and payments",
    intro: "Invoices that All Abode has issued to you are listed here, together with what is still due.",
    steps: [
      "Open Invoices to see every invoice issued to you.",
      "Open an invoice to see its details and due date.",
      "If a payment is due, press Pay now and follow the steps on the payment page.",
      "Press Download to save a copy of the invoice.",
    ],
    notes: [
      "Pay now only appears on invoices that have an amount due.",
      "After paying you are brought back to the portal, where the result of the payment is shown.",
    ],
    href: "/dashboard/owner/invoices",
    cta: "Open Invoices",
  },
  {
    id: "tickets",
    icon: "confirmation_number",
    title: "Tickets",
    intro:
      "Tickets are the maintenance and other requests filed for your properties. This page lets you follow what was reported and how it is progressing.",
    steps: [
      "Open Tickets to see every request for your properties, with how many are still open.",
      "Check each ticket's status to see where it stands.",
    ],
    notes: [
      "This list is for following progress. To raise a concern yourself, contact All Abode directly.",
    ],
    href: "/dashboard/owner/tickets",
    cta: "Open Tickets",
  },
  {
    id: "documents",
    icon: "folder",
    title: "Documents and notices",
    intro:
      "Documents holds the paperwork All Abode has shared with you. Notices holds announcements from All Abode Property Solutions.",
    steps: [
      "Open Documents and press Download next to the document you need.",
      "Open Notices to read the latest announcements.",
      "Watch the bell at the top of the page for new notifications.",
    ],
    notes: [
      "Agreements you sign electronically with All Abode are added to Documents automatically once every party has signed.",
      "Documents are uploaded by your property manager. If one is missing, ask All Abode to share it.",
    ],
    href: "/dashboard/owner/documents",
    cta: "Open Documents",
  },
  {
    id: "account",
    icon: "manage_accounts",
    title: "Your account",
    intro: "Use Account, at the bottom of the menu, to look after your sign-in.",
    steps: [
      "Choose Account at the bottom of the menu.",
      "Enter a new password under Change password and save it.",
      "Use Sign out when you are finished, especially on a shared computer.",
    ],
    notes: ["You sign in with the email address All Abode has on file for you."],
    href: "/dashboard/owner/account",
    cta: "Open Account",
  },
];

const ROUTINE = [
  "Check Statements for a newly published statement and download a copy.",
  "Check Invoices for anything with a payment due.",
  "Look through Tickets and Notices for anything new on your properties.",
];

export default async function OwnerGuidePage() {
  const { role, ownerId } = await getCurrentRole();
  if (role !== "owner") redirect(homeForRole(role));

  const supabase = await createClient();
  const { data } = await supabase.from("owners").select("name").eq("id", ownerId ?? "").maybeSingle();
  const ownerName = (data as { name?: string } | null)?.name ?? "Owner";

  return (
    <DashboardShell role="Owner" nav={ownerNav} userName={ownerName}>
      <HelpGuide
        intro="How to use each part of your owner portal. Come back here whenever you need a reminder."
        routineTitle="A simple monthly check"
        routine={ROUTINE}
        topics={TOPICS}
      />
    </DashboardShell>
  );
}
