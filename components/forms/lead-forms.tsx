"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Field, Input, Textarea, Select } from "@/components/forms/fields";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";

type State = "idle" | "submitting" | "success" | "error";

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/** Shared shell: handles submit lifecycle + success panel. */
function FormShell({
  type,
  submitLabel,
  successTitle,
  successBody,
  build,
  children,
}: {
  type: string;
  submitLabel: string;
  successTitle: string;
  successBody: string;
  /** Read the form, return payload or a field-errors map. */
  build: (data: FormData) => { payload?: Record<string, unknown>; errors?: Record<string, string> };
  children: (errors: Record<string, string>) => ReactNode;
}) {
  const [state, setState] = useState<State>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const { payload, errors: fieldErrors } = build(data);
    if (fieldErrors && Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      setFormError("Please fix the highlighted fields.");
      return;
    }
    setErrors({});
    setFormError("");
    setState("submitting");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, ...payload }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Something went wrong.");
      }
      setState("success");
    } catch (err) {
      setState("error");
      setFormError(err instanceof Error ? err.message : "Submission failed.");
    }
  }

  if (state === "success") {
    return (
      <div className="flex flex-col items-center rounded-lg border border-line bg-surface p-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-available/10 text-available">
          <Icon name="check_circle" size={36} fill={1} />
        </span>
        <h3 className="mt-5 font-display text-2xl font-bold text-navy">
          {successTitle}
        </h3>
        <p className="mt-3 max-w-md text-slate">{successBody}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {children(errors)}
      {formError && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-error">
          <Icon name="error" size={18} />
          {formError}
        </p>
      )}
      <Button type="submit" size="lg" className="mt-1 w-full sm:w-auto">
        {state === "submitting" ? (
          <>
            <Icon name="progress_activity" size={20} className="animate-spin" />
            Sending…
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </form>
  );
}

function reqText(data: FormData, key: string, label: string, errors: Record<string, string>) {
  const v = String(data.get(key) ?? "").trim();
  if (v.length < 2) errors[key] = `${label} is required.`;
  return v;
}
function reqEmail(data: FormData, errors: Record<string, string>) {
  const v = String(data.get("email") ?? "").trim();
  if (!isEmail(v)) errors.email = "Enter a valid email address.";
  return v;
}

/* ---------------- Listing inquiry / viewing ---------------- */
export function InquiryForm({ listingTitle }: { listingTitle?: string }) {
  return (
    <FormShell
      type="inquiry"
      submitLabel="Send Inquiry"
      successTitle="Inquiry received"
      successBody="Thank you — a licensed agent will reach out within one business day to assist you."
      build={(data) => {
        const errors: Record<string, string> = {};
        const name = reqText(data, "name", "Name", errors);
        const email = reqEmail(data, errors);
        if (Object.keys(errors).length) return { errors };
        return {
          payload: {
            name,
            email,
            phone: data.get("phone"),
            message: data.get("message"),
            preferredViewingDate: data.get("preferredViewingDate"),
            preferredContactMethod: data.get("preferredContactMethod"),
            listing: listingTitle,
          },
        };
      }}
    >
      {(e) => (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" required error={e.name}>
              <Input name="name" autoComplete="name" placeholder="Juan dela Cruz" />
            </Field>
            <Field label="Email" required error={e.email}>
              <Input name="email" type="email" autoComplete="email" placeholder="you@email.com" />
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Mobile / Viber / WhatsApp" hint="So we can reach you quickly">
              <Input name="phone" type="tel" autoComplete="tel" placeholder="+63 9XX XXX XXXX" />
            </Field>
            <Field label="Preferred viewing date">
              <Input name="preferredViewingDate" type="date" />
            </Field>
          </div>
          <Field label="Preferred contact method">
            <Select name="preferredContactMethod" defaultValue="Email">
              <option>Email</option>
              <option>Phone call</option>
              <option>Viber</option>
              <option>WhatsApp</option>
            </Select>
          </Field>
          <Field label="Message">
            <Textarea name="message" placeholder="I'd like to schedule a viewing for this property…" />
          </Field>
        </>
      )}
    </FormShell>
  );
}

/* ---------------- Appraisal request ---------------- */
export function AppraisalForm() {
  return (
    <FormShell
      type="appraisal"
      submitLabel="Request Appraisal"
      successTitle="Appraisal request submitted"
      successBody="Our licensed appraiser will review your request and contact you to schedule an inspection."
      build={(data) => {
        const errors: Record<string, string> = {};
        const name = reqText(data, "name", "Name", errors);
        const email = reqEmail(data, errors);
        reqText(data, "propertyLocation", "Property location", errors);
        if (Object.keys(errors).length) return { errors };
        return {
          payload: {
            name,
            email,
            phone: data.get("phone"),
            propertyLocation: data.get("propertyLocation"),
            propertyType: data.get("propertyType"),
            appraisalPurpose: data.get("appraisalPurpose"),
            preferredInspectionDate: data.get("preferredInspectionDate"),
            message: data.get("message"),
          },
        };
      }}
    >
      {(e) => (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" required error={e.name}>
              <Input name="name" autoComplete="name" placeholder="Juan dela Cruz" />
            </Field>
            <Field label="Email" required error={e.email}>
              <Input name="email" type="email" autoComplete="email" placeholder="you@email.com" />
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Mobile">
              <Input name="phone" type="tel" autoComplete="tel" placeholder="+63 9XX XXX XXXX" />
            </Field>
            <Field label="Property location" required error={e.propertyLocation}>
              <Input name="propertyLocation" placeholder="City / district" />
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Property type">
              <Select name="propertyType" defaultValue="Condominium">
                <option>Condominium</option>
                <option>House and Lot</option>
                <option>Vacant Lot</option>
                <option>Commercial</option>
                <option>Industrial / Warehouse</option>
                <option>Agricultural</option>
              </Select>
            </Field>
            <Field label="Purpose of appraisal">
              <Select name="appraisalPurpose" defaultValue="Pre-sale valuation">
                <option>Pre-sale valuation</option>
                <option>Bank loan / collateral</option>
                <option>Estate / inheritance</option>
                <option>Legal / dispute</option>
                <option>Investment analysis</option>
              </Select>
            </Field>
          </div>
          <Field label="Preferred inspection date">
            <Input name="preferredInspectionDate" type="date" />
          </Field>
          <Field label="Message">
            <Textarea name="message" placeholder="Any details about the property or documents you have…" />
          </Field>
        </>
      )}
    </FormShell>
  );
}

/* ---------------- Property management lead ---------------- */
export function PropertyManagementForm() {
  return (
    <FormShell
      type="property-management"
      submitLabel="Request a Proposal"
      successTitle="Request received"
      successBody="Thank you — our property management team will prepare a tailored proposal and reach out shortly."
      build={(data) => {
        const errors: Record<string, string> = {};
        const ownerName = reqText(data, "name", "Name", errors);
        const email = reqEmail(data, errors);
        reqText(data, "propertyLocation", "Property location", errors);
        if (Object.keys(errors).length) return { errors };
        return {
          payload: {
            name: ownerName,
            email,
            phone: data.get("phone"),
            propertyLocation: data.get("propertyLocation"),
            propertyType: data.get("propertyType"),
            numberOfUnits: data.get("numberOfUnits"),
            occupancyStatus: data.get("occupancyStatus"),
            neededService: data.get("neededService"),
            message: data.get("message"),
          },
        };
      }}
    >
      {(e) => (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Owner name" required error={e.name}>
              <Input name="name" autoComplete="name" placeholder="Juan dela Cruz" />
            </Field>
            <Field label="Email" required error={e.email}>
              <Input name="email" type="email" autoComplete="email" placeholder="you@email.com" />
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Mobile">
              <Input name="phone" type="tel" autoComplete="tel" placeholder="+63 9XX XXX XXXX" />
            </Field>
            <Field label="Property location" required error={e.propertyLocation}>
              <Input name="propertyLocation" placeholder="City / district" />
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Property type">
              <Select name="propertyType" defaultValue="Condominium">
                <option>Condominium</option>
                <option>House and Lot</option>
                <option>Apartment</option>
                <option>Commercial</option>
                <option>Mixed-use</option>
              </Select>
            </Field>
            <Field label="No. of units">
              <Input name="numberOfUnits" type="number" min={1} placeholder="1" />
            </Field>
            <Field label="Occupancy">
              <Select name="occupancyStatus" defaultValue="Vacant">
                <option>Vacant</option>
                <option>Partially occupied</option>
                <option>Fully occupied</option>
              </Select>
            </Field>
          </div>
          <Field label="Service needed">
            <Select name="neededService" defaultValue="Full Property Management">
              <option>Basic Leasing Support</option>
              <option>Standard Property Management</option>
              <option>Full Property Management</option>
              <option>Investor Portfolio Management</option>
            </Select>
          </Field>
          <Field label="Message">
            <Textarea name="message" placeholder="Tell us about your property and goals…" />
          </Field>
        </>
      )}
    </FormShell>
  );
}

/* ---------------- General contact ---------------- */
export function ContactForm() {
  return (
    <FormShell
      type="contact"
      submitLabel="Send Message"
      successTitle="Message sent"
      successBody="Thanks for reaching out — we'll get back to you within one business day."
      build={(data) => {
        const errors: Record<string, string> = {};
        const name = reqText(data, "name", "Name", errors);
        const email = reqEmail(data, errors);
        if (Object.keys(errors).length) return { errors };
        return {
          payload: {
            name,
            email,
            phone: data.get("phone"),
            helpWith: data.get("helpWith"),
            propertyLocation: data.get("propertyLocation"),
            message: data.get("message"),
          },
        };
      }}
    >
      {(e) => (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" required error={e.name}>
              <Input name="name" autoComplete="name" placeholder="Juan dela Cruz" />
            </Field>
            <Field label="Email" required error={e.email}>
              <Input name="email" type="email" autoComplete="email" placeholder="you@email.com" />
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Mobile / Viber / WhatsApp">
              <Input name="phone" type="tel" autoComplete="tel" placeholder="+63 9XX XXX XXXX" />
            </Field>
            <Field label="I need help with">
              <Select name="helpWith" defaultValue="Consultation">
                <option>Leasing my property</option>
                <option>Finding a rental</option>
                <option>Selling a property</option>
                <option>Buying a property</option>
                <option>Property management</option>
                <option>Appraisal</option>
                <option>Consultation</option>
              </Select>
            </Field>
          </div>
          <Field label="Property location">
            <Input name="propertyLocation" placeholder="City / district (optional)" />
          </Field>
          <Field label="Message" required error={e.message}>
            <Textarea name="message" placeholder="How can we help?" />
          </Field>
        </>
      )}
    </FormShell>
  );
}

/* ---------------- List my property (owner intake) ---------------- */
export function ListPropertyForm() {
  return (
    <FormShell
      type="list-property"
      submitLabel="Submit Property"
      successTitle="Property submitted"
      successBody="Thank you — our team will review your property details and contact you to discuss next steps."
      build={(data) => {
        const errors: Record<string, string> = {};
        const name = reqText(data, "name", "Name", errors);
        const email = reqEmail(data, errors);
        reqText(data, "propertyLocation", "Property location", errors);
        if (Object.keys(errors).length) return { errors };
        return {
          payload: {
            name,
            email,
            phone: data.get("phone"),
            propertyLocation: data.get("propertyLocation"),
            propertyType: data.get("propertyType"),
            intendedService: data.get("intendedService"),
            bedrooms: data.get("bedrooms"),
            bathrooms: data.get("bathrooms"),
            floorArea: data.get("floorArea"),
            price: data.get("price"),
            message: data.get("message"),
          },
        };
      }}
    >
      {(e) => (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Owner name" required error={e.name}>
              <Input name="name" autoComplete="name" placeholder="Juan dela Cruz" />
            </Field>
            <Field label="Email" required error={e.email}>
              <Input name="email" type="email" autoComplete="email" placeholder="you@email.com" />
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Mobile">
              <Input name="phone" type="tel" autoComplete="tel" placeholder="+63 9XX XXX XXXX" />
            </Field>
            <Field label="Property location" required error={e.propertyLocation}>
              <Input name="propertyLocation" placeholder="City / district" />
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Property type">
              <Select name="propertyType" defaultValue="Condominium">
                <option>Condominium</option>
                <option>House and Lot</option>
                <option>Apartment</option>
                <option>Townhouse</option>
                <option>Commercial</option>
                <option>Lot</option>
              </Select>
            </Field>
            <Field label="Intended service">
              <Select name="intendedService" defaultValue="Lease my property">
                <option>Lease my property</option>
                <option>Sell my property</option>
                <option>Property management</option>
                <option>Appraisal</option>
              </Select>
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-4">
            <Field label="Bedrooms">
              <Input name="bedrooms" type="number" min={0} placeholder="3" />
            </Field>
            <Field label="Bathrooms">
              <Input name="bathrooms" type="number" min={0} placeholder="2" />
            </Field>
            <Field label="Floor area">
              <Input name="floorArea" placeholder="120 sqm" />
            </Field>
            <Field label="Expected price / rent">
              <Input name="price" placeholder="₱ —" />
            </Field>
          </div>
          <Field label="Property description">
            <Textarea name="message" placeholder="Describe the property, amenities, and condition…" />
          </Field>
        </>
      )}
    </FormShell>
  );
}
