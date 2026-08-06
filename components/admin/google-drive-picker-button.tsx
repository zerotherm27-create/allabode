"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { downloadDriveFile, getDriveAccessToken, loadGoogleDriveScripts, openDrivePicker } from "@/lib/google-drive-picker";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID;
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;

/** The Picker's "app ID" is the Cloud project number, which is also the prefix
 *  of the OAuth client ID (`{projectNumber}-{random}.apps.googleusercontent.com`),
 *  so we derive it rather than making it another env var to keep in sync. The
 *  explicit var is only an override for unusual setups. */
const APP_ID = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_APP_ID || CLIENT_ID?.split("-")[0];

export function GoogleDrivePickerButton({
  disabled,
  onFiles,
  onError,
}: {
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  onError?: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  if (!CLIENT_ID || !API_KEY || !APP_ID) return null;

  async function handleClick() {
    setBusy(true);
    try {
      await loadGoogleDriveScripts();
      const accessToken = await getDriveAccessToken(CLIENT_ID!);
      const docs = await openDrivePicker({ apiKey: API_KEY!, accessToken, appId: APP_ID! });
      if (docs.length === 0) return;
      // Sequential, not Promise.all: picking a whole folder can mean dozens of
      // full-size photos, and streaming them all through the download proxy at
      // once risks exhausting the serverless function.
      const files: File[] = [];
      for (const doc of docs) {
        setProgress({ done: files.length, total: docs.length });
        files.push(await downloadDriveFile(doc, accessToken));
      }
      onFiles(files);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Couldn't import photos from Google Drive.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={handleClick}
      className={`inline-flex w-fit items-center gap-2 rounded-md border border-navy bg-surface px-4 py-2.5 text-sm font-semibold text-navy transition hover:bg-surface-gray ${
        disabled || busy ? "pointer-events-none opacity-50" : ""
      }`}
    >
      <Icon name="drive_folder_upload" size={18} />
      {!busy
        ? "Add from Google Drive"
        : progress
          ? `Importing ${progress.done + 1} of ${progress.total}…`
          : "Connecting…"}
    </button>
  );
}
