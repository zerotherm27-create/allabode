"use client";

import { useActionState, useRef } from "react";
import { Icon } from "@/components/icon";
import { uploadDocument, markSigned, deleteDocument, type DocumentActionState } from "@/app/admin/document-actions";

const inputCls = "h-11 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15";

const DOC_TYPES = [
  { value: "lease_contract",   label: "Lease Contract" },
  { value: "id",               label: "Government ID" },
  { value: "proof_of_ownership", label: "Proof of Ownership" },
  { value: "inventory",        label: "Inventory Checklist" },
  { value: "move_in_checklist",label: "Move-in Checklist" },
  { value: "inspection_report",label: "Inspection Report" },
  { value: "other",            label: "Other" },
];

export type DocumentRow = {
  id: string;
  title: string;
  document_type: string;
  file_name: string;
  file_size: number | null;
  visibility: string;
  is_signed: boolean;
  is_immutable: boolean;
  created_at: string;
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function UploadForm({ entityType, entityId }: { entityType: string; entityId: string }) {
  const bound = uploadDocument.bind(null, entityType, entityId);
  const [state, action, pending] = useActionState<DocumentActionState, FormData>(bound, {});
  const ref = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={ref}
      action={async (fd) => {
        await action(fd);
        if (!state.error) ref.current?.reset();
      }}
      className="mt-4 rounded-lg border border-dashed border-line bg-surface-gray p-5"
    >
      <p className="mb-3 text-sm font-medium text-navy">Upload document</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <input type="file" name="file" required className="w-full text-sm text-slate" />
        </div>
        <input name="title" className={inputCls} placeholder="Title (optional — defaults to filename)" />
        <select name="document_type" className={inputCls}>
          {DOC_TYPES.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
        <select name="visibility" className={inputCls} defaultValue="staff">
          <option value="staff">Staff only</option>
          <option value="owner">Owner + Staff</option>
          <option value="tenant">Tenant + Staff</option>
        </select>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
          >
            <Icon name="upload" size={16} />
            {pending ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>
      {state.error && (
        <p role="alert" className="mt-2 text-sm text-sold">{state.error}</p>
      )}
    </form>
  );
}

export function DocumentList({
  documents,
  entityType,
  entityId,
  readOnly = false,
}: {
  documents: DocumentRow[];
  entityType: string;
  entityId: string;
  readOnly?: boolean;
}) {
  const [, markSignedAction] = useActionState(
    async (_: unknown, id: string) => { await markSigned(id); return null; },
    null
  );
  const [, deleteAction] = useActionState(
    async (_: unknown, id: string) => { await deleteDocument(id); return null; },
    null
  );

  return (
    <div>
      {documents.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate">No documents attached yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-navy/5 text-navy-700">
                <Icon name={doc.is_signed ? "verified" : "description"} size={20} fill={doc.is_signed ? 1 : 0} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-navy">{doc.title}</p>
                <p className="text-xs text-slate">
                  {DOC_TYPES.find((d) => d.value === doc.document_type)?.label ?? doc.document_type}
                  {" · "}{formatBytes(doc.file_size)}
                  {" · "}{new Date(doc.created_at).toLocaleDateString("en-PH")}
                  {" · "}<span className="capitalize">{doc.visibility}</span>
                  {doc.is_signed && <span className="ml-1 text-available">· Signed</span>}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <a
                  href={`/api/portal/documents/${doc.id}`}
                  download={doc.file_name}
                  className="flex size-8 items-center justify-center rounded-md text-slate hover:bg-surface-gray hover:text-navy"
                  title="Download"
                >
                  <Icon name="download" size={18} />
                </a>
                {!readOnly && !doc.is_signed && !doc.is_immutable && (
                  <form action={async () => { await markSignedAction(doc.id); }}>
                    <button
                      type="submit"
                      title="Mark signed"
                      className="flex size-8 items-center justify-center rounded-md text-slate hover:bg-surface-gray hover:text-available"
                    >
                      <Icon name="verified" size={18} />
                    </button>
                  </form>
                )}
                {!readOnly && !doc.is_immutable && (
                  <form action={async () => { await deleteAction(doc.id); }}>
                    <button
                      type="submit"
                      title="Delete"
                      className="flex size-8 items-center justify-center rounded-md text-slate hover:bg-surface-gray hover:text-sold"
                    >
                      <Icon name="delete" size={18} />
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {!readOnly && <UploadForm entityType={entityType} entityId={entityId} />}
    </div>
  );
}
