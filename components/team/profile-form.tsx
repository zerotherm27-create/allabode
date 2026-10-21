"use client";

import { type FocusEvent, useActionState, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { Field, Input, Textarea } from "@/components/forms/fields";
import { PROFILE_LIMITS, parseList, parseYears } from "@/lib/team/profile";
import { suggestBio, suggestTagline } from "@/lib/team/profile-suggest";
import {
  PUBLIC_CONTACT_LIMITS,
  normalizeFacebookUrl,
  normalizeLinkedInUrl,
  normalizePhone,
  normalizePublicEmail,
} from "@/lib/team/public-contact";
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
  publicPhone: string;
  publicViber: string;
  publicFacebook: string;
  publicLinkedIn: string;
  publicEmail: string;
  hideCallLink: boolean;
};

type ContactKey = "phone" | "viber" | "facebook" | "linkedin" | "email";

const CONTACT_CHECKS: Record<ContactKey, (v: string) => { ok: true } | { ok: false; error: string }> = {
  phone: (v) => normalizePhone(v, "Mobile number"),
  viber: (v) => normalizePhone(v, "Viber number"),
  facebook: normalizeFacebookUrl,
  linkedin: normalizeLinkedInUrl,
  email: normalizePublicEmail,
};

const idle: SpecialistProfileState = { ok: false, message: "" };

/** "Use suggested text" with an inline confirm before it overwrites anything. */
function SuggestButton({
  hasText,
  onApply,
  label,
}: {
  hasText: boolean;
  onApply: () => void;
  label: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const btn =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-line px-4 text-sm font-semibold text-navy transition-colors hover:bg-surface-gray focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700";
  if (confirming) {
    return (
      <div role="group" aria-label={label} className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <p className="text-sm text-ink">Replace what you wrote with suggested text?</p>
        <div className="flex gap-2">
          <button
            type="button"
            className={btn}
            onClick={() => {
              onApply();
              setConfirming(false);
            }}
          >
            Replace
          </button>
          <button type="button" className={btn} onClick={() => setConfirming(false)}>
            Keep mine
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-2">
      <button type="button" className={btn} onClick={() => (hasText ? setConfirming(true) : onApply())}>
        <Icon name="auto_awesome" size={18} />
        Use suggested text
      </button>
      <p className="mt-1 text-xs text-slate">Edit freely; this is just a starting point. Nothing is saved until you press Save.</p>
    </div>
  );
}

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
  const [tagline, setTagline] = useState(values.tagline);
  const [bio, setBio] = useState(values.bio);
  const formRef = useRef<HTMLFormElement>(null);
  const [contactErrors, setContactErrors] = useState<Partial<Record<ContactKey, string>>>({});
  const checkContact = (key: ContactKey) => (e: FocusEvent<HTMLInputElement>) => {
    const r = CONTACT_CHECKS[key](e.currentTarget.value);
    setContactErrors((prev) => ({ ...prev, [key]: r.ok ? "" : r.error }));
  };

  function current() {
    const fd = new FormData(formRef.current ?? undefined);
    const str = (k: string) => String(fd.get(k) ?? "");
    const years = parseYears(str("years_experience"));
    return {
      name: str("display_name"),
      areas: parseList(str("areas")),
      specialties: parseList(str("specialties")),
      languages: parseList(str("languages")),
      years: typeof years === "number" ? years : null,
    };
  }

  return (
    <form ref={formRef} action={action} noValidate className="flex flex-col gap-5">
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
        <Input
          name="tagline"
          value={tagline}
          onChange={(e) => setTagline(e.currentTarget.value)}
          maxLength={PROFILE_LIMITS.tagline}
        />
      </Field>
      <SuggestButton
        label="Suggested tagline"
        hasText={tagline.trim() !== ""}
        onApply={() => setTagline(suggestTagline(current()))}
      />

      <Field label="About you" hint="A short bio for your public page.">
        <Textarea
          name="bio"
          value={bio}
          onChange={(e) => setBio(e.currentTarget.value)}
          maxLength={PROFILE_LIMITS.bio}
          rows={6}
        />
      </Field>
      <SuggestButton
        label="Suggested About text"
        hasText={bio.trim() !== ""}
        onApply={() => setBio(suggestBio(current()))}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Phone" hint="Private. Only All Abode sees this.">
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

      <fieldset className="flex flex-col gap-5 rounded-md border border-line p-4">
        <legend className="px-1 text-sm font-semibold text-navy">Public contact details</legend>
        <p className="-mt-2 flex items-start gap-2 text-sm text-ink">
          <Icon name="info" size={18} className="mt-0.5 shrink-0 text-navy-700" />
          Anything you add here is shown publicly on your page. Leave blank to use the company details.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Mobile number" hint="For example 0917 123 4567." error={contactErrors.phone}>
            <Input
              name="public_phone"
              type="tel"
              inputMode="tel"
              defaultValue={values.publicPhone}
              maxLength={PUBLIC_CONTACT_LIMITS.phone}
              autoComplete="off"
              onBlur={checkContact("phone")}
            />
          </Field>
          <Field label="Viber number" hint="The number your Viber account uses." error={contactErrors.viber}>
            <Input
              name="public_viber"
              type="tel"
              inputMode="tel"
              defaultValue={values.publicViber}
              maxLength={PUBLIC_CONTACT_LIMITS.phone}
              autoComplete="off"
              onBlur={checkContact("viber")}
            />
          </Field>
        </div>
        <Field label="Facebook link" hint="For example facebook.com/yourpage." error={contactErrors.facebook}>
          <Input
            name="public_facebook_url"
            type="url"
            inputMode="url"
            defaultValue={values.publicFacebook}
            maxLength={PUBLIC_CONTACT_LIMITS.url}
            autoComplete="off"
            onBlur={checkContact("facebook")}
          />
        </Field>
        <Field label="LinkedIn link" hint="For example linkedin.com/in/yourname." error={contactErrors.linkedin}>
          <Input
            name="public_linkedin_url"
            type="url"
            inputMode="url"
            defaultValue={values.publicLinkedIn}
            maxLength={PUBLIC_CONTACT_LIMITS.url}
            autoComplete="off"
            onBlur={checkContact("linkedin")}
          />
        </Field>
        <Field
          label="Public email"
          hint="Shown on your page. Your sign-in email stays private."
          error={contactErrors.email}
        >
          <Input
            name="public_email"
            type="email"
            inputMode="email"
            defaultValue={values.publicEmail}
            maxLength={PUBLIC_CONTACT_LIMITS.email}
            autoComplete="off"
            onBlur={checkContact("email")}
          />
        </Field>
        <div>
          <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm text-ink">
            <input
              type="checkbox"
              name="hide_call_link"
              defaultChecked={values.hideCallLink}
              aria-describedby="hide-call-link-hint"
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded-sm border-line accent-navy"
            />
            <span className="font-semibold text-navy">Don&apos;t show a call link on my page</span>
          </label>
          <p id="hide-call-link-hint" className="ml-7 text-sm text-slate">
            Visitors can still use the contact form, email and your other links.
          </p>
        </div>
      </fieldset>

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
