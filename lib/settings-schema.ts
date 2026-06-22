import { site } from "@/lib/site";

export type Settings = Record<string, string>;

export const settingsFallback: Settings = {
  contact_phone:        site.phone,
  contact_email:        site.email,
  contact_location:     site.location,
  contact_service_area: site.serviceArea,
  social_facebook:      site.facebook,
  social_messenger:     site.messenger,
  social_whatsapp:      site.whatsapp,
  social_viber:         site.viber,
  brand_tagline:        site.tagline,
  brand_descriptor:     site.descriptor,
  hero_heading:         "Your property, professionally taken care of.",
  hero_subheading:      "Brokerage, leasing, property management, and appraisal support through one trusted partner.",
  hero_body:            "All Abode Property Solutions helps owners, investors, buyers, sellers, tenants, and appraisal clients move through property decisions with clear guidance, organized coordination, and licensed professional expertise.",
  hero_image:           "",
};

export function s(settings: Settings, key: string): string {
  return settings[key] ?? settingsFallback[key] ?? "";
}

export const settingsSchema = [
  {
    group: "contact",
    title: "Contact Information",
    icon: "contact_phone",
    fields: [
      { key: "contact_phone",        label: "Phone",               type: "tel" },
      { key: "contact_email",        label: "Email",               type: "email" },
      { key: "contact_location",     label: "Location / Address",  type: "text" },
      { key: "contact_service_area", label: "Service Area",        type: "text" },
    ],
  },
  {
    group: "social",
    title: "Social & Messaging",
    icon: "share",
    fields: [
      { key: "social_facebook",  label: "Facebook URL",   type: "url" },
      { key: "social_messenger", label: "Messenger URL",  type: "url" },
      { key: "social_whatsapp",  label: "WhatsApp URL",   type: "url" },
      { key: "social_viber",     label: "Viber URL",      type: "url" },
    ],
  },
  {
    group: "brand",
    title: "Brand & Identity",
    icon: "business",
    fields: [
      { key: "brand_tagline",    label: "Tagline",                               type: "text" },
      { key: "brand_descriptor", label: "Descriptor (shown in footer / header)", type: "text" },
    ],
  },
  {
    group: "hero",
    title: "Home Page Hero",
    icon: "home",
    fields: [
      { key: "hero_heading",    label: "Heading",          type: "text" },
      { key: "hero_subheading", label: "Subheading",       type: "text" },
      { key: "hero_body",       label: "Body Text",        type: "textarea" },
      { key: "hero_image",      label: "Background Image", type: "image" },
    ],
  },
] as const;
