import OpenAI from "openai";

/** True when the OpenAI key is present. Lets the finance flow degrade to manual entry. */
export function isAiConfigured() {
  return !!process.env.OPENAI_API_KEY;
}

/** Server-only OpenAI client. Throws if called without a key (guard with isAiConfigured first). */
export function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey });
}

// Provider/model metadata — stored on each extraction so every AI output is traceable.
export const AI_PROVIDER = "openai";
export const RECEIPT_MODEL = process.env.OPENAI_RECEIPT_MODEL || "gpt-4.1-mini";
export const RECEIPT_PROMPT_VERSION = "receipt-extract-v1";
