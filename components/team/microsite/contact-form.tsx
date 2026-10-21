"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { Field, Input, Textarea } from "@/components/forms/fields";
import { apexUrl } from "@/components/team/microsite/links";

/**
 * PLACEHOLDER (Task 3 replaces the internals): the final fields and labels,
 * wired to nothing yet. Submitting only shows a "coming soon" note; nothing
 * is sent or stored. Keep the props: the real form tags the inquiry with the
 * specialist.
 */
export function MicrositeContactForm({
  specialistSlug,
  specialistName,
}: {
  specialistSlug: string;
  specialistName: string;
}) {
  const [notice, setNotice] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNotice(true);
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-label={`Send ${specialistName} a message`}
      data-specialist={specialistSlug}
      className="flex flex-col gap-5"
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Name" required>
          <Input name="name" autoComplete="name" required />
        </Field>
        <Field label="Email" required>
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
      </div>
      <Field label="Contact number">
        <Input name="phone" type="tel" autoComplete="tel" inputMode="tel" />
      </Field>
      <Field label="How can I help you?" required>
        <Textarea name="message" rows={4} required />
      </Field>
      <label className="flex cursor-pointer items-start gap-3 text-sm text-slate">
        <input
          type="checkbox"
          name="consent"
          required
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded-sm border-line accent-navy"
        />
        <span>
          I agree to allow All Abode to collect and process my information for the purpose of
          responding to my inquiry. My information will be handled according to the{" "}
          <a
            href={apexUrl("/privacy-policy")}
            className="text-navy-700 underline underline-offset-2 hover:text-gold-ink"
          >
            Privacy Policy
          </a>
          .
        </span>
      </label>
      {notice && (
        <p role="status" className="flex items-center gap-2 border border-line bg-surface-gray px-4 py-3 text-sm text-ink">
          <Icon name="info" size={18} className="shrink-0 text-navy-700" />
          Sending messages from this page is coming soon.
        </p>
      )}
      <Button type="submit" size="lg" className="w-full whitespace-nowrap sm:w-auto sm:self-start">
        Send message
        <Icon name="send" size={16} />
      </Button>
    </form>
  );
}
