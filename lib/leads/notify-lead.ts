// Server-only: alerts the right people about a freshly stored lead.
// Runs inside after() in /api/leads, so it can never delay or fail the response.
//   - company inbox email for EVERY lead (in-house included)
//   - in-app bell row + web push for all staff, and for the assigned specialist only
import { createServiceClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notify";
import { sendEmail } from "@/lib/email";
import { sendPushToUsers } from "@/lib/push/send";
import { getSettings, s } from "@/lib/settings";
import { site } from "@/lib/site";
import { getPublicSiteUrl } from "@/lib/url";
import { escapeHtml } from "@/lib/leads/specialist-lead";
import {
  buildLeadAlert,
  cleanLeadMessage,
  resolveLeadRecipients,
  staffLinkForType,
  type LeadAlertInput,
} from "@/lib/leads/lead-alerts";

export type NotifiedLead = {
  type: string;
  row: Record<string, unknown>;
  /** Approved specialist the lead was assigned to, or null for in-house leads. */
  specialist: { slug: string; name: string } | null;
  /** True when the specialist already received the legacy specialist email, so we skip a second company email. */
  companyEmailed?: boolean;
};

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

function alertInput(lead: NotifiedLead): LeadAlertInput {
  const details =
    lead.row.details && typeof lead.row.details === "object" && !Array.isArray(lead.row.details)
      ? (lead.row.details as Record<string, unknown>)
      : {};
  return {
    type: lead.type,
    name: str(lead.row.name) ?? str(lead.row.owner_name),
    phone: str(lead.row.phone),
    message: str(lead.row.message),
    listing: str(details.listing),
    specialistName: lead.specialist?.name ?? null,
  };
}

async function staffUserIds(service: ReturnType<typeof createServiceClient>): Promise<string[]> {
  const { data } = await service.from("users").select("id");
  return ((data ?? []) as { id: string }[]).map((r) => r.id);
}

async function specialistUserId(
  service: ReturnType<typeof createServiceClient>,
  slug: string,
): Promise<string | null> {
  const { data } = await service
    .from("specialists")
    .select("auth_user_id")
    .eq("subdomain", slug)
    .eq("status", "approved")
    .maybeSingle();
  return (data as { auth_user_id: string | null } | null)?.auth_user_id ?? null;
}

/** Never throws. */
export async function notifyNewLead(lead: NotifiedLead): Promise<void> {
  try {
    const input = alertInput(lead);
    const alert = buildLeadAlert(input);

    // 1) Company inbox email — every lead. The legacy specialist email already covers assigned leads.
    if (!lead.companyEmailed) {
      const settings = await getSettings();
      const companyEmail = s(settings, "contact_email").trim() || site.email;
      let adminUrl: string | null = null;
      try {
        adminUrl = new URL(staffLinkForType(lead.type), getPublicSiteUrl()).toString();
      } catch {
        adminUrl = null;
      }
      const rows: [string, string][] = [
        ["Name", escapeHtml(input.name || "—")],
        ["Email", escapeHtml(str(lead.row.email) ?? "—")],
        ["Contact number", escapeHtml(input.phone || "—")],
        ...(input.listing ? ([["Listing", escapeHtml(input.listing)]] as [string, string][]) : []),
      ];
      const html =
        `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1a2433">` +
        `<p>${escapeHtml(alert.title)}. It is not assigned to a specialist, so it needs All Abode's attention.</p>` +
        `<table style="border-collapse:collapse">${rows
          .map(
            ([k, v]) =>
              `<tr><td style="padding:6px 16px 6px 0;color:#5b6676;vertical-align:top">${k}</td><td style="padding:6px 0">${v}</td></tr>`,
          )
          .join("")}</table>` +
        `<p style="margin-top:16px;color:#5b6676">Message</p><p style="margin-top:4px">${
          escapeHtml(cleanLeadMessage(input.message)).replace(/\n/g, "<br>") || "—"
        }</p>` +
        (adminUrl ? `<p style="margin-top:24px"><a href="${escapeHtml(adminUrl)}">Open it in the admin</a></p>` : "") +
        `<p style="margin-top:24px;font-size:13px;color:#5b6676">All Abode Property Solutions</p></div>`;
      await sendEmail({ to: companyEmail, subject: alert.title, html });
    }

    // 2) In-app + push — needs the service role.
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    const service = createServiceClient();
    const recipients = resolveLeadRecipients({
      type: lead.type,
      staffUserIds: await staffUserIds(service),
      specialistUserId: lead.specialist ? await specialistUserId(service, lead.specialist.slug) : null,
    });
    await Promise.all(
      recipients.map((r) =>
        createNotification(service, {
          recipientUserId: r.userId,
          type: "lead",
          title: alert.title,
          body: alert.body,
          link: r.link,
        }),
      ),
    );
    // Push is grouped by destination so each person's tap opens the right page.
    for (const link of new Set(recipients.map((r) => r.link))) {
      await sendPushToUsers(
        recipients.filter((r) => r.link === link).map((r) => r.userId),
        { title: alert.title, body: alert.body, url: link },
      );
    }
  } catch {
    console.warn("[lead:notify] new-lead alert failed");
  }
}
