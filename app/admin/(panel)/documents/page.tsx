import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { DocumentList, type DocumentRow } from "@/components/admin/document-list";
import { DocumentPreviewButton } from "@/components/admin/document-preview-modal";
import { DocumentsFilterBar } from "@/components/admin/documents-filter-bar";
import { resolveDocumentContexts } from "@/lib/documents/resolve-context";

const DOC_TYPE_LABEL: Record<string, string> = {
  lease_contract:     "Lease Contract",
  id:                 "Government ID",
  proof_of_ownership: "Proof of Ownership",
  inventory:          "Inventory Checklist",
  move_in_checklist:  "Move-in Checklist",
  inspection_report:  "Inspection Report",
  parking_contract:   "Parking Contract",
  other:              "Other",
};

export default async function AdminDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ entity_type?: string; entity_id?: string; property_id?: string; unit_id?: string }>;
}) {
  const { entity_type, entity_id, property_id, unit_id } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("documents")
    .select("id,title,document_type,file_name,file_size,file_mime_type,visibility,is_signed,is_immutable,created_at,entity_type,entity_id")
    .order("created_at", { ascending: false });

  if (entity_type) query = query.eq("entity_type", entity_type);
  if (entity_id)   query = query.eq("entity_id",   entity_id);

  const [{ data }, { data: propertyRows }, { data: unitRows }] = await Promise.all([
    query,
    supabase.from("properties").select("id,name").order("name"),
    supabase.from("units").select("id,unit_label,property_id").order("unit_label"),
  ]);

  const allDocs = (data ?? []) as (DocumentRow & { entity_type: string; entity_id: string })[];
  const contexts = await resolveDocumentContexts(supabase, allDocs);

  const properties = (propertyRows ?? []) as { id: string; name: string }[];
  const units = ((unitRows ?? []) as { id: string; unit_label: string; property_id: string }[]).map((u) => ({
    id: u.id,
    label: u.unit_label,
    propertyId: u.property_id,
  }));

  const docs = allDocs.filter((doc) => {
    const ctx = contexts.get(`${doc.entity_type}:${doc.entity_id}`);
    if (property_id && ctx?.propertyId !== property_id) return false;
    if (unit_id && ctx?.unitId !== unit_id) return false;
    return true;
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Documents</h1>
          <p className="mt-1 text-sm text-slate">{docs.length} document{docs.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {[
          { label: "All", href: "/admin/documents" },
          { label: "Leases", href: "/admin/documents?entity_type=lease" },
          { label: "Properties", href: "/admin/documents?entity_type=property" },
          { label: "Tenants", href: "/admin/documents?entity_type=tenant" },
        ].map(({ label, href }) => (
          <a
            key={href}
            href={href}
            className="rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-medium text-navy hover:border-navy-700 hover:text-navy-700"
          >
            {label}
          </a>
        ))}
        <DocumentsFilterBar
          properties={properties}
          units={units}
          propertyId={property_id ?? ""}
          unitId={unit_id ?? ""}
        />
      </div>

      <div className="mt-4 rounded-lg border border-line bg-surface p-5">
        {docs.length === 0 ? (
          <div className="py-12 text-center">
            <Icon name="folder_open" size={40} className="mx-auto text-slate" />
            <p className="mt-3 text-sm text-slate">No documents found. Upload documents from a lease, property, or tenant record.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-slate">
                <th className="pb-3 font-medium">Title</th>
                <th className="hidden pb-3 font-medium md:table-cell">Type</th>
                <th className="hidden pb-3 font-medium lg:table-cell">Belongs to</th>
                <th className="hidden pb-3 font-medium lg:table-cell">Property / Unit</th>
                <th className="pb-3 font-medium">Visibility</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3"></th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => {
                const ctx = contexts.get(`${doc.entity_type}:${doc.entity_id}`);
                return (
                  <tr key={doc.id} className="border-b border-line last:border-0">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-navy">{doc.title}</p>
                      <p className="text-xs text-slate">{doc.file_name}</p>
                    </td>
                    <td className="hidden py-3 pr-4 text-slate md:table-cell">
                      {DOC_TYPE_LABEL[doc.document_type] ?? doc.document_type}
                    </td>
                    <td className="hidden py-3 pr-4 text-slate lg:table-cell">
                      {ctx?.personName ?? <span className="capitalize">{doc.entity_type.replace(/_/g, " ")}</span>}
                    </td>
                    <td className="hidden py-3 pr-4 text-slate lg:table-cell">
                      {ctx?.propertyName
                        ? `${ctx.propertyName}${ctx.unitLabel ? ` — ${ctx.unitLabel}` : ""}`
                        : "—"}
                    </td>
                    <td className="py-3 pr-4 capitalize text-slate">{doc.visibility}</td>
                    <td className="py-3 pr-4">
                      {doc.is_signed ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-available">
                          <Icon name="verified" size={14} fill={1} /> Signed
                        </span>
                      ) : (
                        <span className="text-xs text-slate">Unsigned</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-xs text-slate">
                      {new Date(doc.created_at).toLocaleDateString("en-PH")}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <DocumentPreviewButton documentId={doc.id} title={doc.title} mimeType={doc.file_mime_type ?? null} />
                        <a
                          href={`/api/portal/documents/${doc.id}`}
                          download={doc.file_name}
                          className="flex size-8 items-center justify-center rounded-md text-slate hover:bg-surface-gray hover:text-navy"
                          title="Download"
                        >
                          <Icon name="download" size={18} />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Upload form for ad-hoc (not attached to a specific entity) — staff can pick entity manually */}
      {entity_type && entity_id && (
        <div className="mt-6">
          <h2 className="mb-2 font-display text-base font-semibold text-navy">Upload to this entity</h2>
          <DocumentList
            documents={docs}
            entityType={entity_type}
            entityId={entity_id}
          />
        </div>
      )}
    </div>
  );
}
