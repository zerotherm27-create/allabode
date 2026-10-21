import type { ReactNode } from "react";

/**
 * Inline brand glyphs for the microsite footer (the Material Symbols icon map
 * has no brand marks). Simplified single-colour shapes on a 24px grid, drawn
 * in currentColor so they take the surrounding text token.
 */
const GLYPHS: Record<SocialNetwork, ReactNode> = {
  facebook: (
    <path d="M14 8h3V4h-3c-2.8 0-4.5 1.9-4.5 4.6V11H7v4h2.5v9h4v-9h3l.5-4h-3.5V9c0-.6.4-1 1-1z" />
  ),
  messenger: (
    <path
      fillRule="evenodd"
      d="M12 2C6.5 2 2 6.1 2 11.2c0 2.9 1.4 5.5 3.7 7.2V22l3.4-1.9c.9.3 1.9.4 2.9.4 5.5 0 10-4.1 10-9.2S17.5 2 12 2zm1 12.4-2.5-2.7-4.9 2.7 5.4-5.8 2.6 2.7 4.8-2.7-5.4 5.8z"
    />
  ),
  whatsapp: (
    <>
      <path
        d="M4 20l1.2-3.9A8.3 8.3 0 1 1 8.1 19z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9.1 7.6c.2-.3.5-.4.8-.4h.5c.2 0 .4.1.5.4l.8 1.8c.1.2 0 .5-.1.7l-.6.7c.6 1.2 1.6 2.2 2.8 2.8l.7-.6c.2-.2.5-.2.7-.1l1.8.8c.3.1.4.3.4.5v.5c0 .3-.1.6-.4.8-.6.4-1.4.6-2.2.4-2.8-.7-5-2.9-5.7-5.7-.2-.8 0-1.6.4-2.2z" />
    </>
  ),
  viber: (
    <>
      <path
        d="M12 2.8c4.9 0 8.2 1.3 8.2 7s-3.3 7-8.2 7c-.6 0-1.3 0-1.9-.1L7 19.6v-3.2c-2.2-1-3.2-3-3.2-6.6 0-5.7 3.3-7 8.2-7z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9.4 6.9c.2-.2.4-.3.7-.3h.4c.2 0 .3.1.4.3l.7 1.5c.1.2 0 .4-.1.6l-.5.5c.5 1 1.3 1.8 2.3 2.3l.5-.5c.2-.2.4-.2.6-.1l1.5.7c.2.1.3.2.3.4v.4c0 .3-.1.5-.3.7-.5.3-1.2.5-1.8.3-2.3-.6-4.1-2.4-4.7-4.7-.2-.6 0-1.3.3-1.8z" />
    </>
  ),
};

export type SocialNetwork = "facebook" | "messenger" | "whatsapp" | "viber";

export const SOCIAL_LABELS: Record<SocialNetwork, string> = {
  facebook: "Facebook",
  messenger: "Messenger",
  whatsapp: "WhatsApp",
  viber: "Viber",
};

export function SocialGlyph({ network, size = 20 }: { network: SocialNetwork; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
    >
      {GLYPHS[network]}
    </svg>
  );
}
