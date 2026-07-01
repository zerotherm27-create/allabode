import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { DashboardShell, Panel, type NavItem } from "@/components/dashboard/shell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole, homeForRole } from "@/lib/auth/role";

export const metadata: Metadata = { title: "Property Documents", robots: { index: false } };

const nav: NavItem[] = [
  { label: "Dashboard",  icon: "dashboard",           href: "/dashboard/owner" },
  { label: "Properties", icon: "apartment",           href: "/dashboard/owner#properties" },
  { label: "Tickets",    icon: "confirmation_number", href: "/dashboard/owner/tickets" },
  { label: "Documents",  icon: "folder",              href: "/dashboard/owner/documents" },
  { label: "Statements", icon: "receipt_long",        href: "/dashboard/owner#statements" },
  { label: "Expenses",   icon: "payments",            href: "/dashboard/owner#expenses" },
];

const DOC_TYPE_LABEL: Record<string, string> = {
  agreement:          "Property Management Agreement",
  lease_contract:     "Lease Contract",
  id:                 "Government ID",
  proof_of_ownership: "Proof of Ownership",
  inventory:          "Inventory Checklist",
  move_in_checklist:  "Move-in Checklist",
  inspection_report:  "Inspection Report",
  other:              "Other",
};

type Doc = {
  id: string; title: string; document_type: string; file_name: string;
  file_size: number | null; is_signed: boolean; created_at: string;
};

export default async function OwnerDocumentsPage() {
  const { role, ownerId } = await getCurrentRole();
  if (role !== "owner") redirect(homeForRole(role));

  const supabase = await createClient();
  const [{ data: docData }, { data: ownerRow }] = await Promise.all([
    supabase.from("documents")
      .select("id,title,document_type,file_name,file_size,is_signed,created_at")
      .order("created_at", { ascending: false }),
    supabase.from("owners").select("name").eq("id", ownerId ?? "").maybeSingle(),
  ]);

  const docs      = (docData ?? []) as Doc[];
  const ownerName = (ownerRow as { name?: string } | null)?.name ?? "Owner";

  return (
    <DashboardShell role="Owner" nav={nav} userName={ownerName}>
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-2xl font-bold text-navy">Property Documents</h1>
        <p className="mt-1 text-sm text-slate">{docs.length} document{docs.length !== 1 ? "s" : ""}</p>

        <div className="mt-6">
          {docs.length === 0 ? (
            <Panel title="No documents yet">
              <div className="py-8 text-center">
                <Icon name="folder_open" size={36} className="mx-auto text-slate" />
                <p className="mt-3 text-sm text-slate">
                  No documents have been shared with you yet. Your property manager will upload documents here — such as lease contracts and property-related paperwork.
                </p>
              </div>
            </Panel>
          ) : (
            <div className="flex flex-col gap-3">
              {docs.map((doc) => (
                <div key={doc.id} className="flex items-center gap-4 rounded-lg border border-line bg-surface p-5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-navy/5 text-navy-700">
                    <Icon name={doc.is_signed ? "verified" : "description"} size={22} fill={doc.is_signed ? 1 : 0} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-navy">{doc.title}</p>
                    <p className="mt-0.5 text-sm text-slate">
                      {DOC_TYPE_LABEL[doc.document_type] ?? doc.document_type}
                      {doc.file_size ? ` · ${(doc.file_size / 1024).toFixed(0)} KB` : ""}
                      {" · "}{new Date(doc.created_at).toLocaleDateString("en-PH")}
                    </p>
                    {doc.is_signed && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-available">
                        <Icon name="verified" size={12} fill={1} /> Signed
                      </p>
                    )}
                  </div>
                  <a
                    href={`/api/portal/documents/${doc.id}`}
                    download={doc.file_name}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line bg-surface-gray px-3 py-2 text-sm font-medium text-navy hover:bg-line"
                  >
                    <Icon name="download" size={16} />
                    Download
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
