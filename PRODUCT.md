# Product

## Register

brand

## Platform

web

## Users

Two primary audiences on one codebase. On the marketing site: property owners and
landlords deciding whether to list, lease, sell, or hand off management of a
property, and prospective tenants/buyers browsing available listings — both
evaluating whether All Abode is a credible, licensed operator worth trusting with
a property or a home search. On the operational side (dashboards, portals): the
owners and tenants who've signed on, managing leases, invoices, tickets, and
documents day-to-day, plus internal staff running property management, finance,
and contract operations. This project treats marketing as the default register;
each dashboard/portal task should confirm product register on its own.

## Product Purpose

A production marketing + operations website for All Abode Property Solutions, a
PRC-licensed Philippine real estate firm spanning leasing, brokerage, property
management, and appraisal. The public site converts owners and tenants into leads
and clients; the connected owner/tenant/admin portals then run the actual
property-management operation end to end — leases, invoicing, maintenance,
e-signed contracts, tenant communication. Success looks like visitors trusting the
firm enough to list a property or send an inquiry, and clients who come on board
getting a smoother, more transparent experience than a typical informal broker
relationship.

## Positioning

All Abode is the only PRC-licensed firm in its market handling leasing, brokerage,
property management, and appraisal end-to-end — one firm, no vendor handoffs — and
it runs that operation on real software (e-signed contracts, automated invoicing,
maintenance tracking) rather than spreadsheets and informal process.

## Conversion & proof

- Primary CTA: List your property (`/list-your-property`).
- Secondary CTA: general contact/inquiry (`/contact`), for visitors not ready to list.
- The line a visitor remembers after 10 seconds: "Your property, handled — leasing,
  sale, management, and appraisal, under one licensed roof."
- Belief ladder: (1) All Abode is a real, PRC-licensed firm, not an individual
  agent or informal broker. (2) They handle leasing, brokerage, property
  management, and appraisal all under one roof, so there's no need to coordinate
  multiple vendors. (3) Their operations run on real systems, not spreadsheets, so
  nothing falls through the cracks. (4) Submitting a property or inquiry is fast
  and gets a real response.
- Proof on hand: PRC license/credentials, client testimonials, and a portfolio /
  track record of managed properties. None are attached as files yet — drop assets
  in `.impeccable/assets/proof/` to reference by path once ready.

## Brand Personality

Modern, warm, professional — matching the "Modern Minimal" design tokens already
in place: light, geometric-sans, generous whitespace, a visible navy brand anchor,
one gold accent used sparingly. Confident and credentialed without reading
corporate-cold; warm enough to invite a first-time property owner in, precise
enough to read as licensed and serious.

## Anti-references

Must not read as a generic, interchangeable real-estate-listing template (stock
hero carousels, no distinct identity). Must not read as an informal individual
broker's Facebook-marketplace page — every surface should reinforce "licensed
firm," not "individual agent." On the portal/admin side specifically: must not
bolt on a generic corporate-SaaS-dashboard look (gradient hero-metric cards,
disconnected visual language) that breaks from the marketing brand — dashboards
should feel like the same company, not a separate product.

## Design Principles

- One firm, no handoffs — every page reinforces the end-to-end service model
  instead of siloing leasing/brokerage/PM/appraisal into separately-branded
  experiences.
- Licensed trust over hype — lead with credentials and specifics (PRC license,
  real numbers, real proof) instead of generic real-estate marketing tropes.
- Operations you can see — the sophistication of the PM/finance backend (e-signed
  contracts, automated invoicing, maintenance tracking) should be felt in the
  portal experience, not just internal plumbing invisible to the client.
- Warm minimalism, not loud — "modern, warm, professional" means restraint:
  generous whitespace, the gold accent used sparingly, never carpeted.
- Portals stay on-brand — dashboards and admin follow the same locked tokens as
  the marketing site; no separate bolted-on SaaS aesthetic.

## Accessibility & Inclusion

WCAG 2.1 AA as a formal target: body text ≥4.5:1 contrast, large text ≥3:1,
visible `:focus-visible` rings (never animated), 44px minimum touch targets,
verified at 320/375/414/768px with no horizontal scroll or two-line buttons. This
formalizes the floor already locked in root `CLAUDE.md`.
