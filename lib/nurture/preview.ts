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
