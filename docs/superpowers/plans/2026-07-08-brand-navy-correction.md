# Brand Navy Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore All Abode’s recognizable navy brand color without undoing the modern-minimal redesign.

**Architecture:** Keep existing Tailwind token names and component classes. Change only shared token values plus documentation and browser/PWA theme hex values so the whole UI inherits the corrected palette.

**Tech Stack:** Next.js App Router, Tailwind CSS v4 `@theme`, TypeScript.

---

### Task 1: Restore Brand Navy Tokens

**Files:**
- Modify: `app/globals.css`
- Modify: `design/DESIGN-TOKENS.md`
- Modify: `app/layout.tsx`
- Modify: `app/manifest.ts`

- [x] **Step 1:** Set `--color-navy` back to brand navy and keep `--color-ink` separate for text.
- [x] **Step 2:** Sync shadcn/radix aliases and focus ring to the blue navy family.
- [x] **Step 3:** Update `design/DESIGN-TOKENS.md` to say the palette uses separate navy and ink roles.
- [x] **Step 4:** Update browser/PWA theme color to the restored brand navy hex.
- [x] **Step 5:** Run `npx tsc --noEmit` and `npx eslint .`.
