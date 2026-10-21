"use client";

import { useActionState, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { Field, Input, Textarea } from "@/components/forms/fields";
import { PROFILE_LIMITS, parseList, parseYears } from "@/lib/team/profile";
import { suggestBio, suggestTagline } from "@/lib/team/profile-suggest";
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
