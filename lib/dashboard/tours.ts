// Step data for the guided tour of each portal's sidebar menu
// (components/dashboard/tour.tsx). Plain data so server layouts can pass it
// straight to the client component. A step's `href` must match a sidebar
// link's href exactly (see lib/dashboard/nav.ts) for the tour to point at it.

export type TourStep = { icon: string; title: string; body: string; href?: string };
export type TourFinish = { href: string; label: string };
export type Tour = { tourId: string; steps: TourStep[]; finish: TourFinish };

const REPLAY = "It takes about a minute, and you can replay it any time from the Help guide.";
const HELP_BODY = "Step-by-step instructions for everything in this tour. Come back to it whenever you need a reminder.";

export const specialistTour: Tour = {
  tourId: "specialist",
  finish: { href: "/dashboard/specialist/getting-started", label: "Open Getting started" },
  steps: [
    {
      icon: "rocket_launch",
      title: "Welcome to your dashboard",
      body: `This short tour shows you what each part of the menu is for. ${REPLAY}`,
    },
    {
      icon: "rocket_launch",
      title: "Getting started",
      body: "Your setup checklist. It tracks what you have finished and tells you what to do next, from your portrait to your first listing.",
      href: "/dashboard/specialist/getting-started",
    },
    {
      icon: "dashboard",
      title: "Overview",
      body: "Your home page. Check here whether your public page is live, publish or unpublish it, and open it the way a client sees it.",
      href: "/dashboard/specialist",
    },
    {
      icon: "forum",
      title: "Leads",
      body: "Everyone who contacts you through your page or a listing lands here. Open a lead to reply, then move it along the stages as you follow up.",
      href: "/dashboard/specialist/leads",
    },
    {
      icon: "mail",
      title: "Follow-up emails",
      body: "The friendly emails All Abode sends for you after an enquiry. Preview them, switch any off, add a personal note or write your own version.",
      href: "/dashboard/specialist/follow-ups",
    },
    {
      icon: "home_work",
      title: "My listings",
      body: "Add the properties you are handling. Save a draft, add photos, then submit it. All Abode reviews each listing before it goes live with your name on it.",
      href: "/dashboard/specialist/listings",
    },
    {
      icon: "person",
      title: "Profile",
      body: "What clients see on your public page: your portrait, introduction, the areas you cover, contact details and page layout.",
      href: "/dashboard/specialist/profile",
    },
    { icon: "menu_book", title: "Help guide", body: HELP_BODY, href: "/dashboard/specialist/guide" },
    {
      icon: "check_circle",
      title: "You are ready to go",
      body: "The best place to begin is Getting started. It walks you through setting up your page one step at a time.",
    },
  ],
};

export const ownerTour: Tour = {
  tourId: "owner",
  finish: { href: "/dashboard/owner", label: "Go to my dashboard" },
  steps: [
    {
      icon: "dashboard",
      title: "Welcome to your owner portal",
      body: `This short tour shows you where to find your properties, statements, invoices and documents. ${REPLAY}`,
    },
    {
      icon: "dashboard",
      title: "Dashboard",
      body: "Your portfolio at a glance: how many properties and units you have, how many are occupied, and your latest net remittance.",
      href: "/dashboard/owner",
    },
    {
      icon: "apartment",
      title: "Properties",
      body: "Every property All Abode manages for you, with the units in each one.",
      href: "/dashboard/owner#properties",
    },
    {
      icon: "confirmation_number",
      title: "Tickets",
      body: "Maintenance and other requests filed for your properties, so you can follow what was reported and how it is progressing.",
      href: "/dashboard/owner/tickets",
    },
    {
      icon: "folder",
      title: "Documents",
      body: "Agreements and paperwork All Abode has shared with you, such as your signed contracts. Download a copy whenever you need one.",
      href: "/dashboard/owner/documents",
    },
    {
      icon: "campaign",
      title: "Notices",
      body: "Announcements from All Abode Property Solutions.",
      href: "/dashboard/owner/notices",
    },
    {
      icon: "request_quote",
      title: "Invoices",
      body: "Invoices issued to you. When a payment is due a Pay now button appears, and you can download any invoice.",
      href: "/dashboard/owner/invoices",
    },
    {
      icon: "receipt_long",
      title: "Statements",
      body: "Your statements of account, showing income, deductions and the net amount for each period. Filter by month or year, then view or download one.",
      href: "/dashboard/owner#statements",
    },
    {
      icon: "payments",
      title: "Expenses",
      body: "The most recent expenses posted against your properties.",
      href: "/dashboard/owner#expenses",
    },
    { icon: "menu_book", title: "Help guide", body: HELP_BODY, href: "/dashboard/owner/guide" },
    {
      icon: "check_circle",
      title: "That is everything",
      body: "Your dashboard is the best place to start. If anything looks wrong or is missing, contact All Abode.",
    },
  ],
};

export const tenantTour: Tour = {
  tourId: "tenant",
  finish: { href: "/dashboard/tenant", label: "Go to my dashboard" },
  steps: [
    {
      icon: "dashboard",
      title: "Welcome to your tenant portal",
      body: `This short tour shows you where to find your lease, pay invoices and ask for help. ${REPLAY}`,
    },
    {
      icon: "dashboard",
      title: "Dashboard",
      body: "Your home page: your monthly rent, when your lease ends and the deposit being held.",
      href: "/dashboard/tenant",
    },
    {
      icon: "description",
      title: "My Lease",
      body: "The details of your current lease.",
      href: "/dashboard/tenant#lease",
    },
    {
      icon: "request_quote",
      title: "Invoices",
      body: "Your rent and other invoices. When a payment is due a Pay now button appears, and you can download any invoice.",
      href: "/dashboard/tenant/invoices",
    },
    {
      icon: "confirmation_number",
      title: "Tickets",
      body: "Need a repair or have a question? Submit a request here, then follow the replies from our team in the same place.",
      href: "/dashboard/tenant/tickets",
    },
    {
      icon: "folder",
      title: "Documents",
      body: "Paperwork shared with you, such as your signed lease contract. Download a copy whenever you need one.",
      href: "/dashboard/tenant/documents",
    },
    {
      icon: "campaign",
      title: "Notices",
      body: "Announcements from All Abode Property Solutions.",
      href: "/dashboard/tenant/notices",
    },
    {
      icon: "payments",
      title: "Payments",
      body: "A record of the payments you have made, each with its acknowledgement receipt.",
      href: "/dashboard/tenant#payments",
    },
    {
      icon: "receipt_long",
      title: "Statements",
      body: "Your statements of account. Filter by month or year, then view or download one.",
      href: "/dashboard/tenant#statements",
    },
    { icon: "menu_book", title: "Help guide", body: HELP_BODY, href: "/dashboard/tenant/guide" },
    {
      icon: "check_circle",
      title: "That is everything",
      body: "Your dashboard is the best place to start. If you need help with anything, submit a request under Tickets.",
    },
  ],
};
