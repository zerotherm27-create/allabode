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
  hero_heading:         "All Abode Property Solutions",
  hero_subheading:      "Licensed real estate brokerage, valuation, leasing, and property management services for property owners, buyers, sellers, tenants, and investors.",
  hero_body:            "All Abode helps you handle real estate with more confidence. Whether you are buying, selling, leasing, managing, or valuing a property, our team provides practical support from inquiry to completion.",
  hero_image:           "",
  page_about_image:     "",
  page_leasing_image:   "",
  page_buysell_image:   "",
  page_pm_image:        "",
  page_appraisal_image: "",
  page_contact_image:   "",
  page_listings_image:  "",
  page_listyour_image:  "",
  page_resources_image: "",
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
  {
    group: "page_heroes",
    title: "Page Hero Backgrounds",
    icon: "photo_library",
    fields: [
      { key: "page_about_image",     label: "About — Background Image",               type: "image" },
      { key: "page_leasing_image",   label: "Leasing — Background Image",             type: "image" },
      { key: "page_buysell_image",   label: "Buy & Sell — Background Image",          type: "image" },
      { key: "page_pm_image",        label: "Property Management — Background Image", type: "image" },
      { key: "page_appraisal_image", label: "Appraisal — Background Image",          type: "image" },
      { key: "page_contact_image",   label: "Contact — Background Image",             type: "image" },
      { key: "page_listings_image",  label: "Listings — Background Image",            type: "image" },
      { key: "page_listyour_image",  label: "List Your Property — Background Image",  type: "image" },
      { key: "page_resources_image", label: "Resources — Background Image",           type: "image" },
    ],
  },
] as const;
