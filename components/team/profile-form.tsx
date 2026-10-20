"use client";

import { useActionState, useState } from "react";
import { Icon } from "@/components/icon";
import { Field, Input, Textarea } from "@/components/forms/fields";
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
};

const idle: SpecialistProfileState = { ok: false, message: "" };

export function SpecialistProfileForm({
  values,
  licenceLine,
}: {
  values: ProfileValues;
  /** The read-only accreditation label shown on the public page. */
  licenceLine: string;
}) {
  const [state, action, pending] = useActionState(updateSpecialistProfile, idle);
  const [nameError, setNameError] = useState("");

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

      <section aria-labelledby="licence-heading" className="rounded-md border border-line p-4">
        <h2 id="licence-heading" className="text-sm font-semibold text-navy">Accreditation</h2>
        <p className="mt-2 text-sm text-ink">{licenceLine}</p>
        <p className="mt-2 flex items-center gap-2 text-xs text-slate">
          <Icon name="verified_user" size={16} />
          Shown under your name on your public page. Set by All Abode.
        </p>
      </section>

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
