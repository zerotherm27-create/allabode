import Link from "next/link";
import { Icon } from "@/components/icon";
import { site } from "@/lib/site";
import { StartTourButton } from "@/components/dashboard/tour";

export type GuideTopic = {
  id: string;
  icon: string;
  title: string;
  intro: string;
  /** What to do, in order. */
  steps: string[];
  /** Rules and behaviour worth knowing. */
  notes: string[];
  href: string;
  cta: string;
};

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700";

/** The Help guide page body shared by the specialist, owner and tenant portals. */
export function HelpGuide({
  intro,
  routineTitle,
  routine,
  topics,
}: {
  intro: React.ReactNode;
  routineTitle: string;
  routine: string[];
  topics: GuideTopic[];
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-bold text-navy">Help guide</h1>
      <p className="mt-1 text-sm text-slate">{intro}</p>
      <div className="mt-4">
        <StartTourButton />
      </div>

      <nav aria-label="Guide topics" className="mt-6 rounded-lg border border-line bg-surface p-3">
        <ul className="grid gap-1 sm:grid-cols-2">
          {topics.map((t) => (
            <li key={t.id}>
              <a
                href={`#${t.id}`}
                className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-navy transition-colors hover:bg-surface-gray ${focus}`}
              >
                <Icon name={t.icon} size={18} className="shrink-0 text-navy-700" />
                {t.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <section aria-labelledby="routine-heading" className="mt-6 rounded-lg border border-gold/40 bg-cream p-5">
        <h2 id="routine-heading" className="font-display text-base font-semibold text-navy">
          {routineTitle}
        </h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm text-ink">
          {routine.map((r) => (
            <li key={r} className="flex gap-2">
              <Icon name="check_circle" size={18} className="mt-0.5 shrink-0 text-navy-700" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-6 flex flex-col gap-6">
        {topics.map((t) => (
          <section
            key={t.id}
            id={t.id}
            aria-labelledby={`${t.id}-heading`}
            className="scroll-mt-20 rounded-lg border border-line bg-surface p-5 md:p-6"
          >
            <div className="flex items-start gap-4">
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-md bg-navy/5 text-navy-700"
              >
                <Icon name={t.icon} size={20} />
              </span>
              <div className="min-w-0">
                <h2 id={`${t.id}-heading`} className="font-display text-lg font-semibold text-navy">
                  {t.title}
                </h2>
                <p className="mt-1 text-sm text-ink">{t.intro}</p>
              </div>
            </div>

            <h3 className="label-caps mt-5 text-slate">How to do it</h3>
            <ol className="mt-2 flex list-decimal flex-col gap-2 pl-5 text-sm text-ink marker:font-semibold marker:text-navy">
              {t.steps.map((s) => (
                <li key={s} className="pl-1">
                  {s}
                </li>
              ))}
            </ol>

            <h3 className="label-caps mt-5 text-slate">Good to know</h3>
            <ul className="mt-2 flex list-disc flex-col gap-2 pl-5 text-sm text-slate">
              {t.notes.map((n) => (
                <li key={n} className="pl-1">
                  {n}
                </li>
              ))}
            </ul>

            <Link
              href={t.href}
              className={`mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-navy px-5 text-sm font-semibold text-white transition-colors hover:bg-navy-700 ${focus}`}
            >
              {t.cta}
              <Icon name="arrow_forward" size={18} />
            </Link>
          </section>
        ))}
      </div>

      <p className="mt-6 text-sm text-slate">
        Still stuck, or something not working as described? Contact{" "}
        <a href={site.emailHref} className={`font-medium text-navy-700 underline ${focus}`}>
          All Abode
        </a>{" "}
        and we will help.
      </p>
    </div>
  );
}
