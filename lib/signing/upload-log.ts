/**
 * Server-side trace for landlord ID upload failures. Errors returned as values
 * from server actions never reach Vercel logs, so a failure that happens before
 * the file hits storage leaves no trace. Never log the signing token or ID data.
 */
export function logIdUploadFailure(
  flow: string,
  step: "ticket" | "confirm",
  error: string,
  detail?: { fileType?: string; fileSize?: number }
) {
  console.error(
    `[id-upload] flow=${flow} step=${step} error=${JSON.stringify(error)}` +
      (detail ? ` type=${detail.fileType || "(empty)"} size=${detail.fileSize ?? "?"}` : "")
  );
}
