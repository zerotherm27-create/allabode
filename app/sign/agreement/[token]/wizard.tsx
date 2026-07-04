"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import SignatureCanvas from "react-signature-canvas";
import { Field, Input, Textarea, Select } from "@/components/forms/fields";
import { FileUploadButton } from "@/components/forms/file-upload-button";
import { Icon } from "@/components/icon";
import { saveAgreementDraft, createAgreementIdUploadTicket, confirmAgreementIdUpload, submitOwnerSignature, type AgreementRecord } from "@/app/sign/agreement-actions";
import { createClient } from "@/lib/supabase/client";
import { AGREEMENTS_BUCKET } from "@/lib/storage";
import { payoutScheduleLabel } from "@/lib/pm/agreement-labels";
import { SIGNING_ID_TYPES } from "@/lib/signing/form-helpers";
import { FullAgreementPreview } from "./full-agreement-preview";

type OwnerDetails = { name: string; nationality: string; civilStatus: string; address: string; email: string; contact: string };
type PropertyDetails = { condo: string; unit: string; address: string; floorArea: string; parking: string; storage: string; furnished: boolean; inclusions: string };
type ServiceSelections = { fullPropertyManagement: boolean; longTermLeasing: boolean; shortTermLeasing: boolean; tenantHunting: boolean; condotelManagement: boolean; otherServices: string };
type AnnexC = {
  minMonthlyRent: string; leaseTerm: string; leaseTermOther: string;
  maxDiscountAmount: string; maxDiscountPercent: string;
  repairLimit: string; repairLimitOther: string;
  petPolicy: string; petConditions: string;
  smokingPolicy: string; subleasing: string; shortTermRentals: string; furnishing: string;
  preferredCommunication: string; preferredResponseTime: string;
  bankName: string; bankAccountName: string; bankAccountNo: string;
  specialInstructions: string;
};
type IntakeProfile = { spouseOrEmergencyName: string; spouseOrEmergencyRelation: string; spouseOrEmergencyContact: string; messenger: string; viberWhatsapp: string };

const inputCls = "h-9";

function emptyOwnerDetails(r: AgreementRecord): OwnerDetails {
  const d = (r.owner_details ?? {}) as Partial<OwnerDetails>;
  return { name: d.name ?? "", nationality: d.nationality ?? "Filipino", civilStatus: d.civilStatus ?? "", address: d.address ?? "", email: d.email ?? r.owner_email, contact: d.contact ?? "" };
}
function emptyPropertyDetails(r: AgreementRecord): PropertyDetails {
  const d = (r.property_details ?? {}) as Partial<PropertyDetails>;
  return { condo: d.condo ?? "", unit: d.unit ?? "", address: d.address ?? "", floorArea: d.floorArea ?? "", parking: d.parking ?? "", storage: d.storage ?? "", furnished: !!d.furnished, inclusions: d.inclusions ?? "" };
}
function emptyServiceSelections(r: AgreementRecord): ServiceSelections {
  const d = (r.service_selections ?? {}) as Partial<ServiceSelections>;
  return { fullPropertyManagement: !!d.fullPropertyManagement, longTermLeasing: !!d.longTermLeasing, shortTermLeasing: !!d.shortTermLeasing, tenantHunting: !!d.tenantHunting, condotelManagement: !!d.condotelManagement, otherServices: d.otherServices ?? "" };
}
function emptyAnnexC(r: AgreementRecord): AnnexC {
  const d = (r.annex_c ?? {}) as Partial<AnnexC>;
  return {
    minMonthlyRent: d.minMonthlyRent ?? "", leaseTerm: d.leaseTerm ?? "12", leaseTermOther: d.leaseTermOther ?? "",
    maxDiscountAmount: d.maxDiscountAmount ?? "", maxDiscountPercent: d.maxDiscountPercent ?? "",
    repairLimit: d.repairLimit ?? "5000", repairLimitOther: d.repairLimitOther ?? "",
    petPolicy: d.petPolicy ?? "no_pets", petConditions: d.petConditions ?? "",
    smokingPolicy: d.smokingPolicy ?? "no_smoking", subleasing: d.subleasing ?? "not_allowed",
    shortTermRentals: d.shortTermRentals ?? "subject_to_rules", furnishing: d.furnishing ?? "bare",
    preferredCommunication: d.preferredCommunication ?? "email", preferredResponseTime: d.preferredResponseTime ?? "office_hours",
    bankName: d.bankName ?? "", bankAccountName: d.bankAccountName ?? "", bankAccountNo: d.bankAccountNo ?? "",
    specialInstructions: d.specialInstructions ?? "",
  };
}
function emptyIntakeProfile(r: AgreementRecord): IntakeProfile {
  const d = (r.intake_profile ?? {}) as Partial<IntakeProfile>;
  return { spouseOrEmergencyName: d.spouseOrEmergencyName ?? "", spouseOrEmergencyRelation: d.spouseOrEmergencyRelation ?? "", spouseOrEmergencyContact: d.spouseOrEmergencyContact ?? "", messenger: d.messenger ?? "", viberWhatsapp: d.viberWhatsapp ?? "" };
}

function StepShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-5 font-display text-lg font-bold text-navy">{title}</h2>
      <div className="flex flex-col gap-5">{children}</div>
    </div>
  );
}

export function AgreementWizard({ token, initial }: { token: string; initial: AgreementRecord }) {
  const [step, setStep] = useState(initial.status === "owner_signed" || initial.status === "completed" ? 7 : 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [ownerDetails, setOwnerDetails] = useState(emptyOwnerDetails(initial));
  const [propertyDetails, setPropertyDetails] = useState(emptyPropertyDetails(initial));
  const [serviceSelections, setServiceSelections] = useState(emptyServiceSelections(initial));
  const [annexC, setAnnexC] = useState(emptyAnnexC(initial));
  const [intakeProfile, setIntakeProfile] = useState(emptyIntakeProfile(initial));
  const [effectiveDate, setEffectiveDate] = useState<string>(initial.effective_date ?? "");
  const [ownerIdType, setOwnerIdType] = useState(initial.owner_id_type ?? "passport");
  const [ownerIdNumber, setOwnerIdNumber] = useState(initial.owner_id_number ?? "");
  const [ownerIdIssuedDate, setOwnerIdIssuedDate] = useState(initial.owner_id_issued_date ?? "");
  const [idUploaded, setIdUploaded] = useState(!!initial.owner_id_document_path);
  const [idUploading, setIdUploading] = useState(false);

  const [typedName, setTypedName] = useState("");
  const [agreeChecked, setAgreeChecked] = useState(false);
  const padRef = useRef<SignatureCanvas>(null);

  async function persist() {
    setSaving(true);
    try {
      const { error: err } = await saveAgreementDraft(token, {
        ownerDetails, propertyDetails, serviceSelections, annexC,
        effectiveDate: effectiveDate || null,
        ownerIdType, ownerIdNumber,
        ownerIdIssuedDate: ownerIdIssuedDate || null,
        intakeProfile,
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
      if (!ownerDetails.name || !ownerDetails.address || !ownerDetails.email) {
        setError("Please fill in your name, address, and email.");
        return;
      }
      if (!ownerIdNumber || !ownerIdIssuedDate || !idUploaded) {
        setError("Please enter your ID number and issue date, and upload a copy of your valid ID before continuing.");
        return;
      }
    }
    if (step === 2) {
      const anySelected = serviceSelections.fullPropertyManagement || serviceSelections.longTermLeasing
        || serviceSelections.shortTermLeasing || serviceSelections.tenantHunting || serviceSelections.condotelManagement
        || !!serviceSelections.otherServices.trim();
      if (!anySelected) {
        setError("Please select at least one service, or describe the service you need under \"Other services.\"");
        return;
      }
    }
    const ok = await persist();
    if (ok) setStep((s) => Math.min(s + 1, 6));
  }
  function back() {
    setError("");
    setStep((s) => Math.max(s - 1, 1));
  }

  async function onIdFileChange(file: File) {
    setIdUploading(true);
    setError("");
    try {
      const ticket = await createAgreementIdUploadTicket(token, file.name, file.size, file.type);
      if (ticket.error || !ticket.signedUrl || !ticket.uploadToken || !ticket.path) {
        setError(ticket.error || "Could not prepare upload.");
        return;
      }
      // Uploads straight from the browser to Supabase Storage — never
      // passes through our server, so it isn't subject to any server
      // function's request-body size limit.
      const { error: upErr } = await createClient()
        .storage.from(AGREEMENTS_BUCKET)
        .uploadToSignedUrl(ticket.path, ticket.uploadToken, file, { contentType: file.type });
      if (upErr) {
        setError(`Upload failed: ${upErr.message}`);
        return;
      }
      const { error: confirmErr } = await confirmAgreementIdUpload(token, ticket.path);
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
      const { error: err } = await submitOwnerSignature(token, { typedName, signatureDataUrl: dataUrl });
      if (err) {
        setError(err);
        return;
      }
      setStep(7);
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
        <p className="label-caps text-gold">Property Management Agreement</p>
      </div>

      {step <= 6 && (
        <div className="mb-6 flex items-center gap-1.5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= step ? "bg-navy" : "bg-surface-gray"}`} />
          ))}
        </div>
      )}

      {step === 1 && (
        <StepShell title="Your details and property">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full legal name" required>
              <Input className={inputCls} value={ownerDetails.name} onChange={(e) => setOwnerDetails({ ...ownerDetails, name: e.target.value })} />
            </Field>
            <Field label="Civil status">
              <Input className={inputCls} value={ownerDetails.civilStatus} onChange={(e) => setOwnerDetails({ ...ownerDetails, civilStatus: e.target.value })} />
            </Field>
          </div>
          <Field label="Address" required>
            <Input className={inputCls} value={ownerDetails.address} onChange={(e) => setOwnerDetails({ ...ownerDetails, address: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" required>
              <Input className={inputCls} type="email" value={ownerDetails.email} onChange={(e) => setOwnerDetails({ ...ownerDetails, email: e.target.value })} />
            </Field>
            <Field label="Contact number">
              <Input className={inputCls} value={ownerDetails.contact} onChange={(e) => setOwnerDetails({ ...ownerDetails, contact: e.target.value })} />
            </Field>
          </div>

          <div className="mt-2 border-t border-line pt-5">
            <h3 className="mb-3 text-sm font-semibold text-navy">Property</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Condominium / Building"><Input className={inputCls} value={propertyDetails.condo} onChange={(e) => setPropertyDetails({ ...propertyDetails, condo: e.target.value })} /></Field>
              <Field label="Unit number"><Input className={inputCls} value={propertyDetails.unit} onChange={(e) => setPropertyDetails({ ...propertyDetails, unit: e.target.value })} /></Field>
            </div>
            <Field label="Property address"><Input className={inputCls} value={propertyDetails.address} onChange={(e) => setPropertyDetails({ ...propertyDetails, address: e.target.value })} /></Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Floor area"><Input className={inputCls} value={propertyDetails.floorArea} onChange={(e) => setPropertyDetails({ ...propertyDetails, floorArea: e.target.value })} /></Field>
              <Field label="Parking slot"><Input className={inputCls} value={propertyDetails.parking} onChange={(e) => setPropertyDetails({ ...propertyDetails, parking: e.target.value })} /></Field>
              <Field label="Storage unit"><Input className={inputCls} value={propertyDetails.storage} onChange={(e) => setPropertyDetails({ ...propertyDetails, storage: e.target.value })} /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={propertyDetails.furnished} onChange={(e) => setPropertyDetails({ ...propertyDetails, furnished: e.target.checked })} className="h-4 w-4 accent-navy" />
              Unit is furnished
            </label>
            <Field label="Inclusive furniture / appliances"><Textarea value={propertyDetails.inclusions} onChange={(e) => setPropertyDetails({ ...propertyDetails, inclusions: e.target.value })} /></Field>
            <Field label="Proposed effective date"><Input className={inputCls} type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} /></Field>
          </div>

          <div className="border-t border-line pt-5">
            <h3 className="mb-1 text-sm font-semibold text-navy">Identity verification</h3>
            <p className="mb-3 text-xs text-slate">Required before you can sign. A passport is preferred.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="ID type" required>
                <Select value={ownerIdType} onChange={(e) => setOwnerIdType(e.target.value)}>
                  {SIGNING_ID_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
              </Field>
              <Field label="ID number" required>
                <Input className={inputCls} value={ownerIdNumber} onChange={(e) => setOwnerIdNumber(e.target.value)} />
              </Field>
            </div>
            <Field label="Date issued" required>
              <Input className={inputCls} type="date" value={ownerIdIssuedDate} onChange={(e) => setOwnerIdIssuedDate(e.target.value)} />
            </Field>
            <Field label="Upload ID image" required hint="JPG, PNG, or PDF, up to 10 MB">
              <FileUploadButton
                accept="image/jpeg,image/png,application/pdf"
                disabled={idUploading}
                onFile={onIdFileChange}
                label={idUploaded ? "Replace ID file" : "Upload ID file"}
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
        <StepShell title="Services Selected">
          <p className="rounded-md bg-surface-gray px-4 py-3 text-xs text-slate">
            Choose at least one service you&apos;d like All Abode to provide &#8212; this becomes Section III of your
            agreement.
          </p>
          <div>
            {([
              ["fullPropertyManagement", "Full Property Management"],
              ["longTermLeasing", "Long-Term Leasing (Six Months or More)"],
              ["shortTermLeasing", "Short-Term / Monthly Leasing"],
              ["tenantHunting", "Tenant Hunting Only"],
              ["condotelManagement", "Condotel Management"],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 py-1.5 text-sm text-ink">
                <input type="checkbox" checked={serviceSelections[key]} onChange={(e) => setServiceSelections({ ...serviceSelections, [key]: e.target.checked })} className="h-4 w-4 accent-navy" />
                {label}
              </label>
            ))}
            <Field label="Other services (optional)" hint="e.g. Bills Payment, Unit Furnishing, Unit Repairs">
              <Input className={inputCls} value={serviceSelections.otherServices} onChange={(e) => setServiceSelections({ ...serviceSelections, otherServices: e.target.value })} />
            </Field>
          </div>
        </StepShell>
      )}

      {step === 3 && (
        <StepShell title="Authority and preferences">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-navy">Leasing authority</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Minimum monthly rent (₱)"><Input className={inputCls} value={annexC.minMonthlyRent} onChange={(e) => setAnnexC({ ...annexC, minMonthlyRent: e.target.value })} /></Field>
              <Field label="Preferred lease term">
                <Select value={annexC.leaseTerm} onChange={(e) => setAnnexC({ ...annexC, leaseTerm: e.target.value })}>
                  <option value="6">6 Months</option>
                  <option value="12">12 Months</option>
                  <option value="24">24 Months</option>
                  <option value="other">Other</option>
                </Select>
              </Field>
            </div>
            {annexC.leaseTerm === "other" && (
              <Field label="Other lease term"><Input className={inputCls} value={annexC.leaseTermOther} onChange={(e) => setAnnexC({ ...annexC, leaseTermOther: e.target.value })} /></Field>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Max discount amount (₱) without your approval"><Input className={inputCls} value={annexC.maxDiscountAmount} onChange={(e) => setAnnexC({ ...annexC, maxDiscountAmount: e.target.value })} /></Field>
              <Field label="Or max discount (%)"><Input className={inputCls} value={annexC.maxDiscountPercent} onChange={(e) => setAnnexC({ ...annexC, maxDiscountPercent: e.target.value })} /></Field>
            </div>
          </div>

          <div className="border-t border-line pt-5">
            <h3 className="mb-3 text-sm font-semibold text-navy">Repair authority</h3>
            <Field label="Manager may approve repairs up to">
              <Select value={annexC.repairLimit} onChange={(e) => setAnnexC({ ...annexC, repairLimit: e.target.value })}>
                <option value="2500">₱2,500</option>
                <option value="5000">₱5,000</option>
                <option value="10000">₱10,000</option>
                <option value="20000">₱20,000</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            {annexC.repairLimit === "other" && (
              <Field label="Other repair limit (₱)"><Input className={inputCls} value={annexC.repairLimitOther} onChange={(e) => setAnnexC({ ...annexC, repairLimitOther: e.target.value })} /></Field>
            )}
          </div>

          <div className="border-t border-line pt-5">
            <h3 className="mb-3 text-sm font-semibold text-navy">Policies</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Pet policy">
                <Select value={annexC.petPolicy} onChange={(e) => setAnnexC({ ...annexC, petPolicy: e.target.value })}>
                  <option value="allowed">Pets Allowed</option>
                  <option value="small_pets">Small Pets Only</option>
                  <option value="no_pets">No Pets</option>
                </Select>
              </Field>
              <Field label="Smoking">
                <Select value={annexC.smokingPolicy} onChange={(e) => setAnnexC({ ...annexC, smokingPolicy: e.target.value })}>
                  <option value="allowed">Allowed</option>
                  <option value="balcony_only">Balcony Only</option>
                  <option value="no_smoking">Strictly No Smoking</option>
                </Select>
              </Field>
              <Field label="Subleasing">
                <Select value={annexC.subleasing} onChange={(e) => setAnnexC({ ...annexC, subleasing: e.target.value })}>
                  <option value="allowed">Allowed</option>
                  <option value="not_allowed">Not Allowed</option>
                </Select>
              </Field>
              <Field label="Short-term rentals">
                <Select value={annexC.shortTermRentals} onChange={(e) => setAnnexC({ ...annexC, shortTermRentals: e.target.value })}>
                  <option value="allowed">Allowed</option>
                  <option value="not_allowed">Not Allowed</option>
                  <option value="subject_to_rules">Subject to Condo Rules</option>
                </Select>
              </Field>
              <Field label="Furnishing">
                <Select value={annexC.furnishing} onChange={(e) => setAnnexC({ ...annexC, furnishing: e.target.value })}>
                  <option value="fully">Fully Furnished</option>
                  <option value="semi">Semi Furnished</option>
                  <option value="bare">Bare Unit</option>
                </Select>
              </Field>
            </div>
          </div>

          <div className="border-t border-line pt-5">
            <h3 className="mb-3 text-sm font-semibold text-navy">Owner preferences</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Preferred communication">
                <Select value={annexC.preferredCommunication} onChange={(e) => setAnnexC({ ...annexC, preferredCommunication: e.target.value })}>
                  <option value="call">Call</option><option value="sms">SMS</option><option value="viber">Viber</option>
                  <option value="whatsapp">WhatsApp</option><option value="email">Email</option>
                </Select>
              </Field>
              <Field label="Preferred response time">
                <Select value={annexC.preferredResponseTime} onChange={(e) => setAnnexC({ ...annexC, preferredResponseTime: e.target.value })}>
                  <option value="anytime">Anytime</option><option value="office_hours">Office Hours</option><option value="weekdays">Weekdays Only</option>
                </Select>
              </Field>
            </div>
          </div>

          <div className="border-t border-line pt-5">
            <h3 className="mb-3 text-sm font-semibold text-navy">Bank details for payout</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Bank"><Input className={inputCls} value={annexC.bankName} onChange={(e) => setAnnexC({ ...annexC, bankName: e.target.value })} /></Field>
              <Field label="Account name"><Input className={inputCls} value={annexC.bankAccountName} onChange={(e) => setAnnexC({ ...annexC, bankAccountName: e.target.value })} /></Field>
              <Field label="Account number"><Input className={inputCls} value={annexC.bankAccountNo} onChange={(e) => setAnnexC({ ...annexC, bankAccountNo: e.target.value })} /></Field>
            </div>
            <p className="rounded-md bg-surface-gray px-3 py-2 text-xs text-slate">
              Payout schedule: {payoutScheduleLabel(initial.payout_day)}{!initial.payout_day && " (exact day is set by All Abode)"}.
            </p>
            <Field label="Special instructions"><Textarea value={annexC.specialInstructions} onChange={(e) => setAnnexC({ ...annexC, specialInstructions: e.target.value })} /></Field>
          </div>
        </StepShell>
      )}

      {step === 4 && (
        <StepShell title="Additional reference info">
          <p className="rounded-md bg-surface-gray px-4 py-3 text-xs text-slate">
            For our internal records only — this is not printed in your contract.
          </p>
          <Field label="Spouse's name (or emergency contact name)"><Input className={inputCls} value={intakeProfile.spouseOrEmergencyName} onChange={(e) => setIntakeProfile({ ...intakeProfile, spouseOrEmergencyName: e.target.value })} /></Field>
          <Field label="Relationship (if emergency contact)"><Input className={inputCls} value={intakeProfile.spouseOrEmergencyRelation} onChange={(e) => setIntakeProfile({ ...intakeProfile, spouseOrEmergencyRelation: e.target.value })} /></Field>
          <Field label="Their contact number"><Input className={inputCls} value={intakeProfile.spouseOrEmergencyContact} onChange={(e) => setIntakeProfile({ ...intakeProfile, spouseOrEmergencyContact: e.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Messenger handle"><Input className={inputCls} value={intakeProfile.messenger} onChange={(e) => setIntakeProfile({ ...intakeProfile, messenger: e.target.value })} /></Field>
            <Field label="Viber / WhatsApp number"><Input className={inputCls} value={intakeProfile.viberWhatsapp} onChange={(e) => setIntakeProfile({ ...intakeProfile, viberWhatsapp: e.target.value })} /></Field>
          </div>
        </StepShell>
      )}

      {step === 5 && (
        <StepShell title="Review your agreement">
          <p className="text-xs text-slate">
            Please read the full agreement below before signing. Annex &#x201C;B&#x201D; and the notarial acknowledgment
            are handled separately and are not shown here.
          </p>
          <div className="max-h-[60vh] overflow-y-auto rounded-md border border-line bg-surface-gray p-5">
            <FullAgreementPreview
              ownerDetails={ownerDetails}
              propertyDetails={propertyDetails}
              serviceSelections={serviceSelections}
              annexC={annexC}
              payoutDay={initial.payout_day}
              effectiveDate={effectiveDate}
              ownerIdType={ownerIdType}
              ownerIdNumber={ownerIdNumber}
              ownerIdIssuedDate={ownerIdIssuedDate}
            />
          </div>
        </StepShell>
      )}

      {step === 6 && (
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
            <span>I have read and agree to the Property Management Agreement, and I am electronically signing in accordance with R.A. 8792.</span>
          </label>
        </StepShell>
      )}

      {step === 7 && (
        <div className="flex flex-col items-center py-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-available/10 text-available">
            <Icon name="check_circle" size={36} fill={1} />
          </span>
          {initial.status === "completed" || initial.status === "owner_signed" ? null : null}
          <h3 className="mt-5 font-display text-2xl font-bold text-navy">
            {initial.status === "completed" ? "Agreement fully executed" : "Thank you for signing"}
          </h3>
          <p className="mt-3 max-w-md text-slate">
            {initial.status === "completed"
              ? "Both parties have signed. Your copy is ready to download below."
              : "We've received your signature. All Abode will countersign shortly and email you once the agreement is fully executed."}
          </p>
          {initial.status === "completed" && (
            <a
              href={`/api/sign/agreement/${token}/pdf`}
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-navy-800"
            >
              <Icon name="download" size={20} /> Download signed agreement
            </a>
          )}
        </div>
      )}

      {error && <p role="alert" className="mt-4 text-sm text-error">{error}</p>}

      {step <= 6 && (
        <div className="mt-6 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button type="button" onClick={back} className="text-sm font-medium text-slate hover:text-navy">Back</button>
          ) : <span />}
          {step < 6 ? (
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
