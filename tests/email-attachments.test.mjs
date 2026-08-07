import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function compile(relPath) {
  const source = fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
  const out = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return `data:text/javascript;base64,${Buffer.from(out).toString("base64")}`;
}

/** Loads lib/email.ts with fetch stubbed, and returns what it would POST to Resend. */
async function captureSend(args) {
  const { sendEmail } = await import(compile("lib/email.ts"));
  const calls = [];
  const realFetch = globalThis.fetch;
  const realKey = process.env.RESEND_API_KEY;
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: 200, text: async () => "" };
  };
  process.env.RESEND_API_KEY = "test-key";
  try {
    await sendEmail(args);
  } finally {
    globalThis.fetch = realFetch;
    if (realKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = realKey;
  }
  return calls;
}

test("an attachment reaches Resend base64-encoded under its own filename", async () => {
  const pdf = Buffer.from("%PDF-1.7 fake statement bytes");
  const calls = await captureSend({
    to: "owner@example.com",
    subject: "Statement of Account available",
    html: "<p>Attached.</p>",
    attachments: [{ filename: "juan-dela-cruz-12b-avida-aug-2026.pdf", content: pdf, contentType: "application/pdf" }],
  });

  assert.equal(calls.length, 1);
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.attachments.length, 1);
  assert.equal(body.attachments[0].filename, "juan-dela-cruz-12b-avida-aug-2026.pdf");
  assert.equal(body.attachments[0].content_type, "application/pdf");
  // Resend takes the bytes base64-encoded, not as a JSON-mangled Buffer.
  assert.equal(body.attachments[0].content, pdf.toString("base64"));
  assert.equal(Buffer.from(body.attachments[0].content, "base64").toString(), pdf.toString());
});

test("a message with no attachments omits the key entirely", async () => {
  const calls = await captureSend({
    to: "owner@example.com",
    subject: "Hello",
    html: "<p>Hi.</p>",
  });

  const body = JSON.parse(calls[0].init.body);
  assert.ok(!("attachments" in body), "an empty attachments key would be sent to Resend as a no-op");
  assert.equal(body.subject, "Hello");
});

test("no API key means no request at all — email never blocks the primary action", async () => {
  const { sendEmail } = await import(compile("lib/email.ts"));
  const realFetch = globalThis.fetch;
  const realKey = process.env.RESEND_API_KEY;
  let called = false;
  globalThis.fetch = async () => { called = true; return { ok: true, text: async () => "" }; };
  delete process.env.RESEND_API_KEY;
  try {
    await sendEmail({ to: "a@b.c", subject: "x", html: "<p>x</p>", attachments: [{ filename: "f.pdf", content: Buffer.from("x") }] });
  } finally {
    globalThis.fetch = realFetch;
    if (realKey !== undefined) process.env.RESEND_API_KEY = realKey;
  }
  assert.equal(called, false);
});
