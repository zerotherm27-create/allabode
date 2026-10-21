// Renders a follow-up template with sample lead data, for the specialist's
// preview and "send me a test email". Reuses the real renderer (which escapes
// every value), so what they see is what a lead would get.
import { site } from "@/lib/site";
import { getPublicSiteUrl } from "@/lib/url";
import { firstName, renderTemplate, type RenderedEmail } from "@/lib/nurture/render";
import { SAMPLE_LEAD } from "@/lib/leads/follow-ups";

export type PreviewSpecialist = {
  display_name: string | null;
  email: string | null;
  phone: string | null;
  subdomain: string | null;
};

export function renderSample(
  template: { subject: string; body: string },
  specialist: PreviewSpecialist,
  personalNote: string | null,
): RenderedEmail {
  const siteUrl = getPublicSiteUrl();
  const name = specialist.display_name?.trim() ?? "";
  return renderTemplate(
    template,
    {
      ...SAMPLE_LEAD,
      lead_url: `${siteUrl}/dashboard/specialist/leads`,
      specialist_name: name,
      specialist_first_name: firstName(name),
      specialist_phone: specialist.phone?.trim() ?? "",
      specialist_email: specialist.email?.trim() ?? "",
      specialist_page_url: specialist.subdomain ? `${siteUrl}/team/${specialist.subdomain}` : "",
      listing_url: `${siteUrl}/listings`,
      personal_note: personalNote?.trim() ?? "",
      site_url: siteUrl,
      company_name: site.name,
    },
    {
      companyName: site.name,
      legalName: site.legalName,
      address: site.location,
      phone: site.phone,
      email: site.email,
      siteUrl,
      unsubscribeUrl: `${siteUrl}/unsubscribe/sample`,
      reason: `You are receiving this because you contacted ${name || "your property specialist"} through ${site.name} and agreed to follow-up emails about your inquiry.`,
    },
  );
}

/**
 * Admin editor preview / test email: sample lead and sample specialist, no
 * real person's data. Customer emails carry a sample unsubscribe link;
 * internal specialist reminders do not. Client-safe (no server imports).
 */
export function renderAdminSample(
  template: { subject: string; body: string },
  audience: "lead" | "specialist",
  siteUrl: string = getPublicSiteUrl(),
): RenderedEmail {
  const name = "Ana Reyes";
  return renderTemplate(
    template,
    {
      ...SAMPLE_LEAD,
      lead_url: `${siteUrl}/dashboard/specialist/leads`,
      specialist_name: name,
      specialist_first_name: firstName(name),
      specialist_phone: "+63 917 000 1111",
      specialist_email: "ana.reyes@example.com",
      specialist_page_url: `${siteUrl}/team/ana-reyes`,
      listing_url: `${siteUrl}/listings`,
      personal_note: "Happy to help you find the right place, and I'm easy to reach on Viber.",
      site_url: siteUrl,
      company_name: site.name,
    },
    {
      companyName: site.name,
      legalName: site.legalName,
      address: site.location,
      phone: site.phone,
      email: site.email,
      siteUrl,
      unsubscribeUrl: audience === "lead" ? `${siteUrl}/unsubscribe/sample` : null,
      reason:
        audience === "lead"
          ? `You are receiving this because you contacted ${name} through ${site.name} and agreed to follow-up emails about your inquiry.`
          : `Internal reminder from ${site.name} about a lead assigned to you.`,
    },
  );
}
