# Compact Footer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the marketing footer shorter and denser while using the larger horizontal white logo.

**Architecture:** Keep existing footer data from `lib/site.ts` and existing `Logo` component API. Change only the white logo asset/size behavior and the footer layout classes/copy.

**Tech Stack:** Next.js App Router, React, Tailwind CSS v4.

---

### Task 1: Compact Footer And Horizontal Logo

**Files:**
- Modify: `components/logo.tsx`
- Modify: `components/site-footer.tsx`

- [x] **Step 1:** Switch `Logo variant="white"` to `public/logo/logo-2-white.png`, the horizontal white logo asset.
- [x] **Step 2:** Increase the default rendered logo height only for the white variant so the footer logo is visibly larger without affecting the header.
- [x] **Step 3:** Reduce footer vertical padding and collapse mast, links, and contact into a tighter responsive grid.
- [x] **Step 4:** Keep compliance/legal copy but shorten its vertical footprint with smaller max width and tighter spacing.
- [x] **Step 5:** Run `npx tsc --noEmit` and `npx eslint .`.
