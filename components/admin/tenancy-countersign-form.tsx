"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { countersignTenancyAgreement } from "@/app/admin/tenancy-actions";
import { SignatureInput, type SignatureInputHandle } from "@/components/forms/signature-input";
import { Field, Input, Select } from "@/components/forms/fields";
import { FileUploadButton } from "@/components/forms/file-upload-button";
import { createClient } from "@/lib/supabase/client";
import { AGREEMENTS_BUCKET } from "@/lib/storage";
import { SIGNING_ID_TYPES } from "@/lib/signing/form-helpers";

const ID_MIMES = ["image/jpeg", "image/png"];
const MAX_ID_SIZE = 10 * 1024 * 1024;

/**
 * Staff fallback for the landlord signature (designated signatory only) —
 * used when the landlord authorized All Abode to execute on their behalf
 * instead of signing via their own remote link. The landlord's ID is required
 * (as on the remote link) unless it's already on file.
 */
export function TenancyCountersignForm({
  agreementId,
  hasLandlordId = false,
}: {
  agreementId: string;
  hasLandlordId?: boolean;
}) {
  const padRef = useRef<SignatureInputHandle>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const [idType, setIdType] = useState("passport");
  const [idNumber, setIdNumber] = useState("");
  const [idIssuedDate, setIdIssuedDate] = useState("");
  const [idPath, setIdPath] = useState<string | null>(null);
  const [idUploading, setIdUploading] = useState(false);

  async function onIdFileChange(file: File) {
    setError("");
    if (!ID_MIMES.includes(file.type)) {
      setError("Please upload a JPG or PNG image — PDF files are not accepted for IDs.");
      return;
    }
    if (file.size <= 0 || file.size > MAX_ID_SIZE) {
      setError("ID image must be under 10 MB.");
      return;
    }
    setIdUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `tenancy/${agreementId}/landlord-id-${Date.now()}.${ext}`;
      const { error: upErr } = await createClient()
        .storage.from(AGREEMENTS_BUCKET)
        .upload(path, file, { contentType: file.type });
      if (upErr) {
        setError(`Upload failed: ${upErr.message}`);
        return;
      }
      setIdPath(path);
    } catch {
      setError("Upload failed — please check your connection and try again.");
    } finally {
      setIdUploading(false);
    }
  }

  async function submit() {
    setError("");
    if (!hasLandlordId && (!idNumber.trim() || !idIssuedDate || !idPath)) {
      setError("Enter the landlord's ID number and issue date, and upload the ID image.");
      return;
    }
    if (!padRef.current || padRef.current.isEmpty()) {
      setError("Please draw or upload the signature first.");
      return;
    }
    const dataUrl = padRef.current.getDataUrl();
    if (!dataUrl) {
      setError("Please draw or upload the signature first.");
      return;
    }
    setPending(true);
    try {
      await countersignTenancyAgreement(
        agreementId,
        dataUrl,
        hasLandlordId || !idPath ? null : { idType, idNumber, idIssuedDate, path: idPath }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to countersign.");
      setPending(false);
    }
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <h2 className="mb-1 font-display text-sm font-semibold text-navy">Countersign for the Landlord</h2>
      <p className="mb-3 text-xs text-slate">
        Fallback when the landlord won&#x2019;t sign remotely — completes the agreement immediately.
      </p>

      {hasLandlordId ? (
        <p className="mb-4 flex items-center gap-1.5 text-xs text-available">
          <Icon name="check_circle" size={16} fill={1} /> Landlord ID already on file
        </p>
      ) : (
        <div className="mb-4 border-b border-line pb-4">
          <h3 className="mb-1 text-sm font-semibold text-navy">Landlord&#x2019;s valid ID</h3>
          <p className="mb-3 text-xs text-slate">
            Required — it appears on the agreement&#x2019;s &quot;Copy of Valid IDs&quot; page.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ID type" required>
              <Select value={idType} onChange={(e) => setIdType(e.target.value)}>
                {SIGNING_ID_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </Field>
            <Field label="ID number" required>
              <Input className="h-9" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
            </Field>
          </div>
          <Field label="Date issued" required>
            <Input className="h-9" type="date" value={idIssuedDate} onChange={(e) => setIdIssuedDate(e.target.value)} />
          </Field>
          <Field label="Upload ID image" required hint="JPG or PNG image, up to 10 MB">
            <FileUploadButton
              accept="image/jpeg,image/png"
              disabled={idUploading}
              onFile={onIdFileChange}
              label={idPath ? "Replace ID file" : "Upload ID file"}
            />
          </Field>
          {idUploading && <p className="text-xs text-slate">Uploading…</p>}
          {idPath && !idUploading && (
            <p className="flex items-center gap-1.5 text-xs text-available"><Icon name="check_circle" size={16} fill={1} /> ID uploaded</p>
          )}
        </div>
      )}

      <SignatureInput ref={padRef} />
      {error && <p role="alert" className="mt-2 text-sm text-error">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={pending || idUploading}
        className="mt-3 inline-flex items-center gap-2 rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
      >
        {pending ? <Icon name="progress_activity" size={18} className="animate-spin" /> : <Icon name="verified" size={18} />}
        {pending ? "Signing…" : "Countersign & complete"}
      </button>
    </div>
  );
}
