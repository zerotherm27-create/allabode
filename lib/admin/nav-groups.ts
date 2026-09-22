export type AdminNavItem = { label: string; icon: string; href: string };
export type AdminNavGroup = { group: string | null; items: AdminNavItem[] };

export const navGroups: AdminNavGroup[] = [
  {
    group: null,
    items: [
      { label: "Overview", icon: "dashboard", href: "/admin" },
    ],
  },
  {
    group: "Property Management",
    items: [
      { label: "Properties", icon: "apartment",     href: "/admin/properties" },
      { label: "Units",      icon: "door_front",    href: "/admin/units"      },
      { label: "Owners",     icon: "person",        href: "/admin/owners"     },
      { label: "Tenants",    icon: "groups",        href: "/admin/tenants"    },
      { label: "Leases",     icon: "description",   href: "/admin/leases"     },
      { label: "Vendors",    icon: "handyman",      href: "/admin/vendors"    },
      { label: "Maintenance",icon: "build",         href: "/admin/maintenance"},
      { label: "Work Orders",icon: "handyman",      href: "/admin/work-orders"},
    ],
  },
  {
    group: "Tickets",
    items: [
      { label: "Tickets",   icon: "confirmation_number", href: "/admin/tickets" },
      { label: "Documents", icon: "folder",              href: "/admin/documents" },
    ],
  },
  {
    group: "Agreements",
    items: [
      { label: "Contracts", icon: "history_edu", href: "/admin/contracts" },
      { label: "Quotations", icon: "price_check", href: "/admin/quotations" },
    ],
  },
  {
    group: "Finance",
    items: [
      { label: "Invoices",   icon: "request_quote", href: "/admin/invoices"   },
      { label: "Receipts",   icon: "receipt",       href: "/admin/receipts"   },
      { label: "Expenses",   icon: "payments",      href: "/admin/expenses"   },
      { label: "Statements", icon: "receipt_long",  href: "/admin/statements"        },
      { label: "Deposits",   icon: "savings",       href: "/admin/security-deposits" },
      { label: "Audit Log",  icon: "history",       href: "/admin/audit"             },
    ],
  },
  {
    group: "Marketing",
    items: [
      { label: "Listings",   icon: "home_work",     href: "/admin/listings"   },
      { label: "Viewings",   icon: "event_available", href: "/admin/viewings" },
      { label: "Inquiries",  icon: "forum",         href: "/admin/inquiries"  },
      { label: "Appraisals", icon: "analytics",     href: "/admin/appraisals" },
      { label: "PM Leads",   icon: "corporate_fare",href: "/admin/leads"      },
      { label: "Site Analytics", icon: "monitoring", href: "/admin/analytics" },
    ],
  },
  {
    group: "System",
    items: [
      { label: "Account",       icon: "manage_accounts", href: "/admin/account"   },
      { label: "Pending Signups", icon: "person_add", href: "/admin/pending-signups" },
      { label: "Notices",       icon: "campaign",   href: "/admin/notices"    },
      { label: "Automation",    icon: "autorenew",  href: "/admin/automation" },
      { label: "Site Settings", icon: "tune",       href: "/admin/settings"   },
      { label: "Setup Guide",   icon: "menu_book",  href: "/admin/setup"      },
    ],
  },
  {
    group: "More",
    items: [
      { label: "Viewing Availability", icon: "event",         href: "/admin/viewings/availability" },
      { label: "New Maintenance Plan", icon: "checklist",     href: "/admin/maintenance/plans/new" },
      { label: "New Parking Agreement",icon: "local_parking", href: "/admin/contracts/parking/new" },
      { label: "New Tenancy Agreement",icon: "history_edu",   href: "/admin/contracts/tenancy/new" },
      { label: "New Short-Term Rental",icon: "flight",        href: "/admin/contracts/short-term-rental/new" },
      { label: "New Addendum",         icon: "note_add",      href: "/admin/contracts/addendum/new" },
    ],
  },
];
