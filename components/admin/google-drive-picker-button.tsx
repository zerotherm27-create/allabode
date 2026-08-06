"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { downloadDriveFile, getDriveAccessToken, loadGoogleDriveScripts, openDrivePicker } from "@/lib/google-drive-picker";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID;
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;

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

  if (!CLIENT_ID || !API_KEY) return null;

  async function handleClick() {
    setBusy(true);
    try {
      await loadGoogleDriveScripts();
      const accessToken = await getDriveAccessToken(CLIENT_ID!);
      const docs = await openDrivePicker({ apiKey: API_KEY!, accessToken });
      if (docs.length === 0) return;
      const files = await Promise.all(docs.map((doc) => downloadDriveFile(doc, accessToken)));
      onFiles(files);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Couldn't import photos from Google Drive.");
    } finally {
      setBusy(false);
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
      {busy ? "Connecting…" : "Add from Google Drive"}
    </button>
  );
}
