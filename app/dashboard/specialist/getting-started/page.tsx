import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { getCurrentRole, homeForRole } from "@/lib/auth/role";
import { loadOnboarding } from "@/lib/team/onboarding-data";
import type { OnboardingStep, StepState } from "@/lib/team/onboarding";

export const metadata: Metadata = { title: "Getting started", robots: { index: false } };

const BADGE: Record<StepState, { label: string; cls: string }> = {
  done: { label: "Done", cls: "bg-available/10 text-available" },
  todo: { label: "To do", cls: "bg-gold/15 text-navy" },
  optional: { label: "Optional", cls: "bg-surface-gray text-slate" },
};

const buttonCls =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700";

function StepCard({ step, index, isNext }: { step: OnboardingStep; index: number; isNext: boolean }) {
  const badge = BADGE[step.state];
  const headingId = `step-${step.id}`;
  const external = step.href.startsWith("https://");
  const primary = step.state === "done" ? "border border-line text-navy hover:bg-surface-gray" : "bg-navy text-white hover:bg-navy-700";
  return (
    <li>
      <section
        aria-labelledby={headingId}
        className={`rounded-lg border bg-surface p-5 ${isNext ? "border-gold ring-1 ring-gold" : "border-line"}`}
      >
        <div className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-md bg-navy font-display text-sm font-bold text-white"
          >
            {step.state === "done" ? <Icon name="check_circle" size={20} /> : index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id={headingId} className="font-display text-base font-semibold text-navy">
                {step.title}
              </h2>
              <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${badge.cls}`}>{badge.label}</span>
              {isNext && <span className="rounded-md bg-navy px-2 py-0.5 text-xs font-semibold text-white">Next up</span>}
            </div>
            <p className="mt-1 text-sm text-ink">{step.why}</p>
            <ul className="mt-3 flex list-disc flex-col gap-1 pl-5 text-sm text-slate">
              {step.detail.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
            <p className="mt-3 flex items-center gap-1.5 text-sm text-slate">
              <Icon name="schedule" size={16} />
              {step.howLong}
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {external ? (
                <a href={step.href} target="_blank" rel="noopener noreferrer" className={`${buttonCls} ${primary}`}>
                  {step.ctaLabel}
                  <Icon name="open_in_new" size={18} />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              ) : (
                <Link href={step.href} className={`${buttonCls} ${primary}`}>
                  {step.ctaLabel}
                  <Icon name="arrow_forward" size={18} />
                </Link>
              )}
              {step.links
                ?.filter((l) => l.href !== step.href)
                .map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${buttonCls} border border-line text-navy hover:bg-surface-gray`}
                  >
                    {l.label}
                    <Icon name="open_in_new" size={18} />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                ))}
            </div>
          </div>
        </div>
      </section>
    </li>
  );
}

export default async function GettingStartedPage() {
  const { role, specialistId } = await getCurrentRole();
  if (role !== "specialist" || !specialistId) redirect(homeForRole(role));

  const guide = await loadOnboarding(specialistId);
  const pct = guide && guide.total > 0 ? Math.round((guide.done / guide.total) * 100) : 0;
  const next = guide?.steps.find((s) => s.id === guide.nextStepId) ?? null;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-bold text-navy">Getting started</h1>
      <p className="mt-1 text-sm text-slate">
        Welcome to All Abode. These steps take you from a new account to a page you are proud to share. You can do them in any
        order and come back whenever you like.
      </p>

      {!guide ? (
        <p className="mt-6 rounded-lg border border-line bg-surface p-5 text-sm text-slate" role="status">
          We couldn&apos;t load your progress just now. Please refresh the page in a moment. You can still use the rest of your
          dashboard.
        </p>
      ) : (
        <>
          <section aria-labelledby="guide-progress" className="mt-6 rounded-lg border border-line bg-surface p-5">
            <h2 id="guide-progress" className="font-display text-base font-semibold text-navy">
              {guide.done} of {guide.total} steps done
            </h2>
            <div
              role="progressbar"
              aria-labelledby="guide-progress"
              aria-valuemin={0}
              aria-valuemax={guide.total}
              aria-valuenow={guide.done}
              className="mt-3 h-2 w-full overflow-hidden rounded-sm bg-surface-gray"
            >
              <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-3 text-sm text-slate">
              {guide.complete
                ? "You have finished every step. Your page is ready to share, and you can still change anything at any time."
                : next
                  ? `Next up: ${next.title}.`
                  : ""}
            </p>
          </section>

          <ol className="mt-6 flex flex-col gap-4">
            {guide.steps.map((s, i) => (
              <StepCard key={s.id} step={s} index={i} isNext={s.id === guide.nextStepId} />
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
