"use client";

import { useEffect, useState, type ReactNode } from "react";

export type MobileBarItem = {
  key: string;
  label: string;
  href: string;
  ariaLabel?: string;
  icon: ReactNode;
  /** The brass primary action (the message form); the others are plain. */
  primary?: boolean;
};

/**
 * Phone-only action bar fixed to the bottom of the screen: the direct contact
 * links plus "Inquire". It stays out of the way while the hero (which has its
 * own button) is on screen and again once the contact section is reached, so
 * it never covers the form or the footer. Sits under the cookie banner
 * (z-[70]) and pads for the home indicator.
 */
export function MobileContactBar({ items }: { items: MobileBarItem[] }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hero = document.querySelector("[data-microsite-hero]");
    const contact = document.getElementById("contact");
    if (!hero || !contact) return;
    let heroVisible = true;
    let contactReached = false;
    const update = () => setShow(!heroVisible && !contactReached);
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === hero) heroVisible = e.isIntersecting;
        // Reached = on screen now, or already scrolled past (its top is above the viewport).
        else contactReached = e.isIntersecting || e.boundingClientRect.top < 0;
      }
      update();
    });
    io.observe(hero);
    io.observe(contact);
    return () => io.disconnect();
  }, []);

  return (
    <div
      inert={!show}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-[var(--shadow-lift)] transition-transform duration-[var(--dur-mid)] ease-[var(--ease-out)] md:hidden ${
        show ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <ul className="grid auto-cols-fr grid-flow-col">
        {items.map((item) => (
          <li key={item.key} className="min-w-0">
            <a
              href={item.href}
              aria-label={item.ariaLabel}
              className={`flex min-h-14 items-center justify-center gap-2 px-2 font-display text-sm font-semibold ${
                item.primary ? "bg-gold text-navy" : "border-r border-line text-navy"
              }`}
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
