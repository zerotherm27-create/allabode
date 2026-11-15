"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Icon } from "@/components/icon";

/** Set once the specialist has finished or skipped the tour, so it only opens by itself once. */
const DONE_KEY = "aa_specialist_tour_done";
const START_EVENT = "aa:start-specialist-tour";
const SIDEBAR_WIDTH = 260;
const CARD_WIDTH = 352;

type Step = { icon: string; title: string; body: string; /** Sidebar link this step points at. */ href?: string };

const STEPS: Step[] = [
  {
    icon: "rocket_launch",
    title: "Welcome to your dashboard",
    body: "This short tour shows you what each part of the menu is for. It takes about a minute, and you can replay it any time from the Help guide.",
  },
  {
    icon: "rocket_launch",
    title: "Getting started",
    body: "Your setup checklist. It tracks what you have finished and tells you what to do next, from your portrait to your first listing.",
    href: "/dashboard/specialist/getting-started",
  },
  {
    icon: "dashboard",
    title: "Overview",
    body: "Your home page. Check here whether your public page is live, publish or unpublish it, and open it the way a client sees it.",
    href: "/dashboard/specialist",
  },
  {
    icon: "forum",
    title: "Leads",
    body: "Everyone who contacts you through your page or a listing lands here. Open a lead to reply, then move it along the stages as you follow up.",
    href: "/dashboard/specialist/leads",
  },
  {
    icon: "mail",
    title: "Follow-up emails",
    body: "The friendly emails All Abode sends for you after an enquiry. Preview them, switch any off, add a personal note or write your own version.",
    href: "/dashboard/specialist/follow-ups",
  },
  {
    icon: "home_work",
    title: "My listings",
    body: "Add the properties you are handling. Save a draft, add photos, then submit it. All Abode reviews each listing before it goes live with your name on it.",
    href: "/dashboard/specialist/listings",
  },
  {
    icon: "person",
    title: "Profile",
    body: "What clients see on your public page: your portrait, introduction, the areas you cover, contact details and page layout.",
    href: "/dashboard/specialist/profile",
  },
  {
    icon: "menu_book",
    title: "Help guide",
    body: "Step-by-step instructions for everything in this tour. Come back to it whenever you need a reminder.",
    href: "/dashboard/specialist/guide",
  },
  {
    icon: "check_circle",
    title: "You are ready to go",
    body: "The best place to begin is Getting started. It walks you through setting up your page one step at a time.",
  },
];

type Anchor = { top: number; left: number; width: number; height: number; cardTop: number };

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700";
const primaryBtn = `inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-navy px-5 text-sm font-semibold text-white transition-colors hover:bg-navy-700 ${focus}`;
const secondaryBtn = `inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-line bg-surface px-4 text-sm font-semibold text-navy transition-colors hover:bg-surface-gray ${focus}`;

function markDone() {
  try {
    window.localStorage.setItem(DONE_KEY, "1");
  } catch {
    // Private browsing or blocked storage: the tour may simply show again next time.
  }
}

/** Replays the tour. Works anywhere inside the specialist dashboard. */
export function StartTourButton({ className }: { className?: string }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(START_EVENT))} className={className ?? secondaryBtn}>
      <Icon name="rocket_launch" size={18} />
      Take the dashboard tour
    </button>
  );
}

/**
 * Guided tour of the specialist dashboard menu. Opens by itself on a
 * specialist's first visit and again whenever StartTourButton is pressed.
 * On wide screens each step points at its sidebar link; on small screens,
 * where the menu is tucked away, the steps show as a centred card.
 */
export function DashboardTour() {
  const [step, setStep] = useState<number | null>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const open = step !== null;
  const current = open ? STEPS[step] : null;
  const isLast = step === STEPS.length - 1;

  const close = useCallback(() => {
    markDone();
    setStep(null);
    setAnchor(null);
    returnFocus.current?.focus();
    returnFocus.current = null;
  }, []);

  // Open by itself on the first visit, and on demand from StartTourButton.
  useEffect(() => {
    const start = () => {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setStep(0);
    };
    let seen = true;
    try {
      seen = window.localStorage.getItem(DONE_KEY) === "1";
    } catch {
      // Storage unavailable: don't open by ourselves, so the tour can't reappear on every page.
    }
    const timer = seen ? null : window.setTimeout(start, 600);
    window.addEventListener(START_EVENT, start);
    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener(START_EVENT, start);
    };
  }, []);

  // Find the sidebar link for this step (wide screens only) and keep the card beside it.
  useEffect(() => {
    if (step === null) return;
    const measure = () => {
      const href = STEPS[step].href;
      const wide = window.matchMedia("(min-width: 1024px)").matches;
      const el = href && wide ? document.querySelector(`nav[aria-label="Dashboard"] a[href="${href}"]`) : null;
      if (!el) return setAnchor(null);
      const r = el.getBoundingClientRect();
      const cardHeight = cardRef.current?.offsetHeight ?? 280;
      const cardTop = Math.max(16, Math.min(r.top - 12, window.innerHeight - cardHeight - 16));
      setAnchor({ top: r.top, left: r.left, width: r.width, height: r.height, cardTop });
    };
    const frame = window.requestAnimationFrame(() => {
      measure();
      headingRef.current?.focus();
    });
    window.addEventListener("resize", measure);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
    };
  }, [step]);

  // Escape closes; Tab stays inside the card.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab" || !cardRef.current) return;
      const items = Array.from(cardRef.current.querySelectorAll<HTMLElement>("button, a[href]"));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!cardRef.current.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && (active === first || active === headingRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open || !current) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60]">
      {/* Dim the page. Beside the sidebar when pointing at it, so the menu stays bright. */}
      <div aria-hidden="true" className="absolute inset-y-0 right-0 bg-navy/50" style={{ left: anchor ? SIDEBAR_WIDTH : 0 }} />

      {anchor && (
        <div
          aria-hidden="true"
          className="absolute rounded-md border-2 border-gold-bright"
          style={{ top: anchor.top - 2, left: anchor.left - 2, width: anchor.width + 4, height: anchor.height + 4 }}
        />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        className={`absolute rounded-lg border border-line bg-surface p-5 shadow-xl ${
          anchor ? "" : "left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2"
        }`}
        style={anchor ? { top: anchor.cardTop, left: anchor.left + anchor.width + 20, width: CARD_WIDTH } : undefined}
      >
        <div className="flex items-start justify-between gap-3">
          <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-md bg-navy text-white">
            <Icon name={current.icon} size={20} />
          </span>
          <button
            type="button"
            onClick={close}
            aria-label="Close the tour"
            className={`-mr-2 -mt-2 flex size-11 items-center justify-center rounded-md text-slate transition-colors hover:bg-surface-gray hover:text-navy ${focus}`}
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <p className="label-caps mt-3 text-slate">
          Step {step + 1} of {STEPS.length}
        </p>
        <h2 id="tour-title" ref={headingRef} tabIndex={-1} className="mt-1 font-display text-lg font-semibold text-navy outline-none">
          {current.title}
        </h2>
        <p id="tour-body" className="mt-2 text-sm text-ink">
          {current.body}
        </p>
        {current.href && !anchor && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-slate">
            <Icon name="menu" size={16} className="shrink-0" />
            Find it in the menu at the top left.
          </p>
        )}

        <div
          role="progressbar"
          aria-label="Tour progress"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={step + 1}
          className="mt-4 h-1.5 w-full overflow-hidden rounded-sm bg-surface-gray"
        >
          <div className="h-full bg-gold" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {step > 0 ? (
            <button type="button" onClick={() => setStep(step - 1)} className={secondaryBtn}>
              <Icon name="arrow_back" size={18} />
              Back
            </button>
          ) : (
            <button type="button" onClick={close} className={secondaryBtn}>
              Skip tour
            </button>
          )}
          {isLast ? (
            <Link href="/dashboard/specialist/getting-started" onClick={close} className={primaryBtn}>
              Open Getting started
              <Icon name="arrow_forward" size={18} />
            </Link>
          ) : (
            <button type="button" onClick={() => setStep(step + 1)} className={primaryBtn}>
              {step === 0 ? "Start tour" : "Next"}
              <Icon name="arrow_forward" size={18} />
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
