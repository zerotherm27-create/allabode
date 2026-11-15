// Sidebar menus for the owner and tenant portals, shared by every page in
// each portal so the menu is the same wherever you are. (Account lives in the
// sidebar footer, so it is not repeated here.)

import type { NavItem } from "@/components/dashboard/shell";

export const ownerNav: NavItem[] = [
  { label: "Dashboard", icon: "dashboard", href: "/dashboard/owner" },
  { label: "Properties", icon: "apartment", href: "/dashboard/owner#properties" },
  { label: "Tickets", icon: "confirmation_number", href: "/dashboard/owner/tickets" },
  { label: "Documents", icon: "folder", href: "/dashboard/owner/documents" },
  { label: "Notices", icon: "campaign", href: "/dashboard/owner/notices" },
  { label: "Invoices", icon: "request_quote", href: "/dashboard/owner/invoices" },
  { label: "Statements", icon: "receipt_long", href: "/dashboard/owner#statements" },
  { label: "Expenses", icon: "payments", href: "/dashboard/owner#expenses" },
  { label: "Help guide", icon: "menu_book", href: "/dashboard/owner/guide" },
];

export const tenantNav: NavItem[] = [
  { label: "Dashboard", icon: "dashboard", href: "/dashboard/tenant" },
  { label: "My Lease", icon: "description", href: "/dashboard/tenant#lease" },
  { label: "Invoices", icon: "request_quote", href: "/dashboard/tenant/invoices" },
  { label: "Tickets", icon: "confirmation_number", href: "/dashboard/tenant/tickets" },
  { label: "Documents", icon: "folder", href: "/dashboard/tenant/documents" },
  { label: "Notices", icon: "campaign", href: "/dashboard/tenant/notices" },
  { label: "Payments", icon: "payments", href: "/dashboard/tenant#payments" },
  { label: "Statements", icon: "receipt_long", href: "/dashboard/tenant#statements" },
  { label: "Help guide", icon: "menu_book", href: "/dashboard/tenant/guide" },
];
