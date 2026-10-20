"use client";

import { useActionState, useState } from "react";
import { Icon } from "@/components/icon";
import { Field, Input, Select, Textarea } from "@/components/forms/fields";
import { licenseLine } from "@/lib/team/license";
import { PROFILE_LIMITS } from "@/lib/team/profile";
import {
  updateSpecialistProfile,
  type SpecialistProfileState,
} from "@/app/dashboard/specialist/actions";

export type ProfileValues = {
  displayName: string;
  tagline: string;
  bio: string;
  phone: string;
  yearsExperience: string;
  areas: string;
  specialties: string;
  languages: string;
  licenseMode: "own" | "accredited";
  licenseNo: string;
  licenseExpiry: string;
};

const idle: SpecialistProfileState = { ok: false, message: "" };

export function SpecialistProfileForm({
  values,
  licenseLocked,
  broker,
}: {
  values: ProfileValues;
  licenseLocked: boolean;
  broker: { name: string; licenseNo: string } | null;
}) {
  const [state, action, pending] = useActionState(updateSpecialistProfile, idle);
  const [mode, setMode] = useState(values.licenseMode);
  const [licenseNo, setLicenseNo] = useState(values.licenseNo);
  const [nameError, setNameError] = useState("");

  const preview = licenseLine({ licenseMode: mode, licenseNo: licenseNo.trim() || null }, broker);

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <Field label="Display name" required error={nameError}>
        <Input
          name="display_name"
          defaultValue={values.displayName}
          maxLength={PROFILE_LIMITS.displayName}
          autoComplete="name"
          onBlur={(e) => setNameError(e.currentTarget.value.trim() ? "" : "Enter your display name.")}
        />
      </Field>

      <Field label="Tagline" hint="One line under your name. Up to 140 characters.">
        <Input name="tagline" defaultValue={values.tagline} maxLength={PROFILE_LIMITS.tagline} />
      </Field>

      <Field label="About you" hint="A short bio for your public page.">
        <Textarea name="bio" defaultValue={values.bio} maxLength={PROFILE_LIMITS.bio} rows={6} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Phone">
          <Input
            name="phone"
            type="tel"
            defaultValue={values.phone}
            maxLength={PROFILE_LIMITS.phone}
            autoComplete="tel"
          />
        </Field>
        <Field label="Years of experience">
          <Input
            name="years_experience"
            inputMode="numeric"
            defaultValue={values.yearsExperience}
            maxLength={2}
          />
        </Field>
      </div>

      <Field label="Areas you cover" hint="Separate with commas, for example Makati, BGC, Ortigas.">
        <Input name="areas" defaultValue={values.areas} />
      </Field>
      <Field label="Specialties" hint="Separate with commas, for example Pre-selling condos, Leasing.">
        <Input name="specialties" defaultValue={values.specialties} />
      </Field>
      <Field label="Languages" hint="Separate with commas, for example English, Filipino.">
        <Input name="languages" defaultValue={values.languages} />
      </Field>

      <fieldset className="rounded-md border border-line p-4">
        <legend className="px-1 text-sm font-semibold text-navy">Licence</legend>
        {licenseLocked ? (
          <div className="flex flex-col gap-2 text-sm text-ink">
            <p>
              <span className="text-slate">Type: </span>
              {values.licenseMode === "own" ? "Own PRC licence" : "Accredited under the broker"}
            </p>
            {values.licenseNo && (
              <p>
                <span className="text-slate">Licence number: </span>
                {values.licenseNo}
              </p>
            )}
            {values.licenseExpiry && (
              <p>
                <span className="text-slate">Expires: </span>
                {values.licenseExpiry}
              </p>
            )}
            <p className="mt-1 flex items-center gap-2 text-slate">
              <Icon name="verified_user" size={16} />
              Contact All Abode to change your licence details
            </p>
          </div>
        ) : (
          <div className="mt-2 flex flex-col gap-5">
            <Field label="How are you licensed?">
              <Select
                name="license_mode"
                value={mode}
                onChange={(e) => setMode(e.currentTarget.value as "own" | "accredited")}
              >
                <option value="accredited">Accredited under the broker</option>
                <option value="own">I hold my own PRC licence</option>
              </Select>
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="PRC licence number">
                <Input
                  name="license_no"
                  value={licenseNo}
                  onChange={(e) => setLicenseNo(e.currentTarget.value)}
                  maxLength={PROFILE_LIMITS.licenseNo}
                />
              </Field>
              <Field label="Licence expiry">
                <Input name="license_expiry" type="date" defaultValue={values.licenseExpiry} />
              </Field>
            </div>
          </div>
        )}
        <p className="mt-4 text-xs text-slate">
          Shown on your public page:{" "}
          <span className="font-medium text-ink">
            {preview ?? "Nothing yet. Add a licence number to show a licence line."}
          </span>
        </p>
      </fieldset>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-navy px-6 text-sm font-semibold text-white transition-colors hover:bg-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save profile"}
        </button>
        <p
          role={state.message ? (state.ok ? "status" : "alert") : undefined}
          className={`text-sm ${state.ok ? "text-available" : "text-error"}`}
        >
          {state.message}
        </p>
      </div>
    </form>
  );
}
