"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import SignatureCanvas from "react-signature-canvas";
import { Field, Input, Select } from "@/components/forms/fields";
import { Icon } from "@/components/icon";
import {
  saveParkingDraft, createParkingIdUploadTicket, confirmParkingIdUpload, submitParkingTenantSignature,
  type ParkingAgreementRecord,
} from "@/app/sign/parking-actions";
import { createClient } from "@/lib/supabase/client";
import { AGREEMENTS_BUCKET } from "@/lib/storage";
import type { ParkingTenantDetails, VehicleDetails } from "@/lib/pm/parking-clauses";
import { FullParkingPreview } from "./full-parking-preview";

type TenantForm = { name: string; address: string; contact: string; email: string };
type VehicleForm = { makeModel: string; plateNo: string; color: string };

const inputCls = "h-9";
const DONE_STEP = 4;

function initialTenantForm(r: ParkingAgreementRecord): TenantForm {
  const d = (r.tenant_details ?? {}) as Partial<ParkingTenantDetails>;
  return {
    name: d.name ?? "",
    address: d.address ?? "",
    contact: d.contact ?? "",
    email: d.email ?? r.tenant_email,
  };
}

function initialVehicleForm(r: ParkingAgreementRecord): VehicleForm {
  const d = (r.vehicle_details ?? {}) as Partial<VehicleDetails>;
  return { makeModel: d.makeModel ?? "", plateNo: d.plateNo ?? "", color: d.color ?? "" };
}

const ID_TYPES = [
  { value: "passport", label: "Passport" },
  { value: "drivers_license", label: "Driver's License" },
  { value: "national_id", label: "Philippine National ID" },
  { value: "umid", label: "UMID" },
  { value: "other", label: "Other government ID" },
];

function StepShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-5 font-display text-lg font-bold text-navy">{title}</h2>
      <div className="flex flex-col gap-5">{children}</div>
    </div>
  );
}

export function ParkingWizard({ token, initial }: { token: string; initial: ParkingAgreementRecord }) {
  const [step, setStep] = useState(initial.status === "tenant_signed" || initial.status === "completed" ? DONE_STEP : 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [tenant, setTenant] = useState(initialTenantForm(initial));
  const [vehicle, setVehicle] = useState(initialVehicleForm(initial));
  const [idType, setIdType] = useState(initial.tenant_id_type ?? "passport");
  const [idNumber, setIdNumber] = useState(initial.tenant_id_number ?? "");
  const [idIssuedDate, setIdIssuedDate] = useState(initial.tenant_id_issued_date ?? "");
  const [idUploaded, setIdUploaded] = useState(!!initial.tenant_id_document_path);
  const [idUploading, setIdUploading] = useState(false);

  const [typedName, setTypedName] = useState("");
  const [agreeChecked, setAgreeChecked] = useState(false);
  const padRef = useRef<SignatureCanvas>(null);

  async function persist() {
    setSaving(true);
    try {
      const { error: err } = await saveParkingDraft(token, {
        tenantDetails: { ...tenant },
        vehicleDetails: { ...vehicle },
        tenantIdType: idType,
        tenantIdNumber: idNumber || null,
        tenantIdIssuedDate: idIssuedDate || null,
      });
      if (err) {
        setError(err);
        return false;
      }
      return true;
    } catch {
      setError("Couldn't save your progress — please check your connection and try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function next() {
    setError("");
    if (step === 1) {
      if (!tenant.name || !tenant.address || !tenant.email) {
        setError("Please fill in your name, address, and email.");
        return;
      }
      if (!vehicle.makeModel || !vehicle.plateNo) {
        setError("Please fill in your vehicle's make/model and plate number.");
        return;
      }
      if (!idNumber || !idIssuedDate || !idUploaded) {
        setError("Please enter your ID number and issue date, and upload a copy of your government ID before continuing.");
        return;
      }
    }
    const ok = await persist();
    if (ok) setStep((s) => Math.min(s + 1, 3));
  }
  function back() {
    setError("");
    setStep((s) => Math.max(s - 1, 1));
  }

  async function onIdFileChange(file: File) {
    setIdUploading(true);
    setError("");
    try {
      const ticket = await createParkingIdUploadTicket(token, file.name, file.size, file.type);
      if (ticket.error || !ticket.signedUrl || !ticket.uploadToken || !ticket.path) {
        setError(ticket.error || "Could not prepare upload.");
        return;
      }
      // Browser -> Supabase Storage directly (not subject to server
      // request-body limits); the ticket is the credential.
      const { error: upErr } = await createClient()
        .storage.from(AGREEMENTS_BUCKET)
        .uploadToSignedUrl(ticket.path, ticket.uploadToken, file, { contentType: file.type });
      if (upErr) {
        setError(`Upload failed: ${upErr.message}`);
        return;
      }
      const { error: confirmErr } = await confirmParkingIdUpload(token, ticket.path);
      if (confirmErr) {
        setError(confirmErr);
        return;
      }
      setIdUploaded(true);
    } catch {
      setError("Upload failed — please check your connection and try again.");
    } finally {
      setIdUploading(false);
    }
  }

  async function sign() {
    setError("");
    if (!typedName.trim()) {
      setError("Please type your full legal name.");
      return;
    }
    if (!padRef.current || padRef.current.isEmpty()) {
      setError("Please draw your signature.");
      return;
    }
    if (!agreeChecked) {
      setError("Please confirm you have read and agree to the Agreement.");
      return;
    }
    setSaving(true);
    try {
      const dataUrl = padRef.current.toDataURL("image/png");
      const { error: err } = await submitParkingTenantSignature(token, { typedName, signatureDataUrl: dataUrl });
      if (err) {
        setError(err);
        return;
      }
      setStep(DONE_STEP);
    } catch {
      setError("Couldn't submit your signature — please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full max-w-2xl rounded-lg border border-line bg-surface p-6 sm:p-8">
      <div className="mb-6 flex flex-col items-center gap-2">
        <Image src="/logo/logo-primary.png" alt="All Abode Property Solutions" width={160} height={48} className="h-10 w-auto" />
        <p className="label-caps text-gold">Parking Space Rental Agreement</p>
      </div>

      {step < DONE_STEP && (
        <div className="mb-6 flex items-center gap-1.5">
          {[1, 2, 3].map((n) => (
            <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= step ? "bg-navy" : "bg-surface-gray"}`} />
          ))}
        </div>
      )}

      {step === 1 && (
        <StepShell title="Your details">
          <p className="rounded-md bg-surface-gray px-4 py-3 text-xs text-slate">
            The rental terms (parking space, rate, deposits, and schedule) have been prepared by All Abode —
            you&apos;ll review them in the next step. Here we only need your details and your vehicle&apos;s.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full legal name" required>
              <Input className={inputCls} value={tenant.name} onChange={(e) => setTenant({ ...tenant, name: e.target.value })} />
            </Field>
            <Field label="Contact number">
              <Input className={inputCls} value={tenant.contact} onChange={(e) => setTenant({ ...tenant, contact: e.target.value })} />
            </Field>
          </div>
          <Field label="Residential address" required>
            <Input className={inputCls} value={tenant.address} onChange={(e) => setTenant({ ...tenant, address: e.target.value })} />
          </Field>
          <Field label="Email" required>
            <Input className={inputCls} type="email" value={tenant.email} onChange={(e) => setTenant({ ...tenant, email: e.target.value })} />
          </Field>

          <div className="mt-2 border-t border-line pt-5">
            <h3 className="mb-1 text-sm font-semibold text-navy">Authorized vehicle</h3>
            <p className="mb-3 text-xs text-slate">
              Only this vehicle, registered in your name, may use the parking space (clause 7 of the agreement).
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Make / model" required>
                <Input className={inputCls} value={vehicle.makeModel} onChange={(e) => setVehicle({ ...vehicle, makeModel: e.target.value })} />
              </Field>
              <Field label="Plate no." required>
                <Input className={inputCls} value={vehicle.plateNo} onChange={(e) => setVehicle({ ...vehicle, plateNo: e.target.value })} />
              </Field>
              <Field label="Color">
                <Input className={inputCls} value={vehicle.color} onChange={(e) => setVehicle({ ...vehicle, color: e.target.value })} />
              </Field>
            </div>
          </div>

          <div className="border-t border-line pt-5">
            <h3 className="mb-1 text-sm font-semibold text-navy">Identity verification</h3>
            <p className="mb-3 text-xs text-slate">Required before you can sign. A passport is preferred.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="ID type" required>
                <Select value={idType} onChange={(e) => setIdType(e.target.value)}>
                  {ID_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
              </Field>
              <Field label="ID number" required>
                <Input className={inputCls} value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
              </Field>
            </div>
            <Field label="Date issued" required>
              <Input className={inputCls} type="date" value={idIssuedDate} onChange={(e) => setIdIssuedDate(e.target.value)} />
            </Field>
            <Field label="Upload ID image" required hint="JPG, PNG, or PDF, up to 10 MB">
              <input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                disabled={idUploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onIdFileChange(f); }}
                className="block w-full text-sm text-slate"
              />
            </Field>
            {idUploading && <p className="text-xs text-slate">Uploading…</p>}
            {idUploaded && !idUploading && (
              <p className="flex items-center gap-1.5 text-xs text-available"><Icon name="check_circle" size={16} fill={1} /> ID uploaded</p>
            )}
          </div>
        </StepShell>
      )}

      {step === 2 && (
        <StepShell title="Review your agreement">
          <p className="text-xs text-slate">
            Please read the full agreement below before signing. The notarial acknowledgment is handled separately
            and is not shown here.
          </p>
          <div className="max-h-[60vh] overflow-y-auto rounded-md border border-line bg-surface-gray p-5">
            <FullParkingPreview
              record={initial}
              tenantDetails={{ ...tenant }}
              vehicleDetails={{ ...vehicle }}
            />
          </div>
        </StepShell>
      )}

      {step === 3 && (
        <StepShell title="Sign your agreement">
          <Field label="Type your full legal name" required>
            <Input className={inputCls} value={typedName} onChange={(e) => setTypedName(e.target.value)} />
          </Field>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy">Draw your signature</label>
            <div className="overflow-hidden rounded-md border border-line bg-surface-gray">
              <SignatureCanvas ref={padRef} penColor="#0a2540" canvasProps={{ className: "h-40 w-full" }} />
            </div>
            <button type="button" onClick={() => padRef.current?.clear()} className="mt-1 text-xs font-medium text-slate hover:text-navy">Clear</button>
          </div>
          <label className="flex items-start gap-3 text-sm text-slate">
            <input type="checkbox" checked={agreeChecked} onChange={(e) => setAgreeChecked(e.target.checked)} className="mt-0.5 h-4 w-4 accent-navy" />
            <span>I have read and agree to the Parking Space Rental Agreement, and I am electronically signing in accordance with R.A. 8792.</span>
          </label>
        </StepShell>
      )}

      {step === DONE_STEP && (
        <div className="flex flex-col items-center py-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-available/10 text-available">
            <Icon name="check_circle" size={36} fill={1} />
          </span>
          <h3 className="mt-5 font-display text-2xl font-bold text-navy">
            {initial.status === "completed" ? "Agreement fully executed" : "Thank you for signing"}
          </h3>
          <p className="mt-3 max-w-md text-slate">
            {initial.status === "completed"
              ? "Both parties have signed. Your copy is ready to download below."
              : "We've received your signature. The landlord will sign next, and we'll email you once the agreement is fully executed."}
          </p>
          {initial.status === "completed" && (
            <a
              href={`/api/sign/parking/${token}/pdf`}
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-navy-800"
            >
              <Icon name="download" size={20} /> Download signed agreement
            </a>
          )}
        </div>
      )}

      {error && <p role="alert" className="mt-4 text-sm text-error">{error}</p>}

      {step < DONE_STEP && (
        <div className="mt-6 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button type="button" onClick={back} className="text-sm font-medium text-slate hover:text-navy">Back</button>
          ) : <span />}
          {step < 3 ? (
            <button type="button" onClick={next} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50">
              {saving ? <Icon name="progress_activity" size={18} className="animate-spin" /> : null}
              Next
            </button>
          ) : (
            <button type="button" onClick={sign} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50">
              {saving ? <Icon name="progress_activity" size={18} className="animate-spin" /> : null}
              Sign agreement
            </button>
          )}
        </div>
      )}
    </div>
  );
}
