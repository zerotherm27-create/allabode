import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/shell";
import { HelpGuide, type GuideTopic } from "@/components/dashboard/help-guide";
import { tenantNav } from "@/lib/dashboard/nav";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole, homeForRole } from "@/lib/auth/role";

export const metadata: Metadata = { title: "Help guide", robots: { index: false } };

const TOPICS: GuideTopic[] = [
  {
    id: "lease",
    icon: "description",
    title: "Your dashboard and lease",
    intro: "The dashboard shows the key facts about your tenancy: your monthly rent, when your lease ends and the deposit being held.",
    steps: [
      "Open Dashboard to see your rent, lease end date and deposit.",
      "Choose My Lease in the menu to jump to the details of your current lease.",
    ],
    notes: [
      "Your lease details are set up by your property manager. You cannot edit them here.",
      "If the dashboard says you have no lease on file yet, your property manager still needs to set it up.",
      "If any detail looks wrong, submit a request under Tickets and choose Lease Inquiry.",
    ],
    href: "/dashboard/tenant#lease",
    cta: "Open My Lease",
  },
  {
    id: "invoices",
    icon: "request_quote",
    title: "Invoices and paying",
    intro: "Your rent and other invoices are listed here, together with what is still due.",
    steps: [
      "Open Invoices to see every invoice issued to you.",
      "Use the month and year filters to find a particular invoice.",
      "Open an invoice to see its details and billing period.",
      "If a payment is due, press Pay now and follow the steps on the payment page.",
      "Press Download to save a copy of the invoice.",
    ],
    notes: [
      "Pay now only appears on invoices that have an amount due.",
      "After paying you are brought back to the portal, where the result of the payment is shown.",
      "If an invoice looks wrong, submit a request under Tickets and choose Billing Inquiry.",
    ],
    href: "/dashboard/tenant/invoices",
    cta: "Open Invoices",
  },
  {
    id: "payments",
    icon: "payments",
    title: "Payment history and statements",
    intro: "Payments is the record of what you have paid. Statements are your statements of account for each period.",
    steps: [
      "Choose Payments in the menu to jump to your payment history.",
      "Open the acknowledgement receipt next to a payment when you need proof of it.",
      "Choose Statements in the menu, then use the month and year filters to find a period.",
      "Open a statement to view it, and press Download to save a copy.",
    ],
    notes: ["A statement appears here once All Abode has published it."],
    href: "/dashboard/tenant#payments",
    cta: "Open Payments",
  },
  {
    id: "tickets",
    icon: "confirmation_number",
    title: "Tickets: asking for help",
    intro: "Use a ticket to report a repair, ask about your bill or lease, or raise any other concern. It is the quickest way to reach our team.",
    steps: [
      "Open Tickets and press Submit request.",
      "Choose the category that fits best, for example Maintenance or Billing Inquiry.",
      "Write a short subject and describe the issue: where it is, when it started and anything else that helps.",
      "Press Submit request. Your ticket now appears in My Tickets.",
      "Open the ticket to read replies from our team and add a reply or update of your own.",
    ],
    notes: [
      "Keep everything about one issue in the same ticket, so the whole conversation stays together.",
      "Submit a separate ticket for each separate issue.",
      "The more detail you give at the start, the faster we can help.",
    ],
    href: "/dashboard/tenant/tickets",
    cta: "Open Tickets",
  },
  {
    id: "documents",
    icon: "folder",
    title: "Documents and notices",
    intro: "Documents holds the paperwork shared with you. Notices holds announcements from All Abode Property Solutions.",
    steps: [
      "Open Documents and press Download next to the document you need.",
      "Open Notices to read the latest announcements.",
      "Watch the bell at the top of the page for new notifications.",
    ],
    notes: [
      "A contract you sign electronically with All Abode is added to Documents automatically once every party has signed.",
      "Documents are uploaded by your property manager. If one is missing, submit a request under Tickets.",
    ],
    href: "/dashboard/tenant/documents",
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
    href: "/dashboard/tenant/account",
    cta: "Open Account",
  },
];

const ROUTINE = [
  "Check Invoices for anything with a payment due and pay it before the due date.",
  "Read any new Notices.",
  "Check Tickets for replies to your open requests.",
];

export default async function TenantGuidePage() {
  const { role, tenantId } = await getCurrentRole();
  if (role !== "tenant") redirect(homeForRole(role));

  const supabase = await createClient();
  const { data } = await supabase.from("tenants").select("name").eq("id", tenantId ?? "").maybeSingle();
  const tenantName = (data as { name?: string } | null)?.name ?? "Tenant";

  return (
    <DashboardShell role="Tenant" nav={tenantNav} userName={tenantName}>
      <HelpGuide
        intro="How to use each part of your tenant portal. Come back here whenever you need a reminder."
        routineTitle="A simple monthly check"
        routine={ROUTINE}
        topics={TOPICS}
      />
    </DashboardShell>
  );
}
