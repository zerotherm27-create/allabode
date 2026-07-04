"use client";

import { Icon } from "@/components/icon";

export function FileUploadButton({
  accept,
  disabled,
  onFile,
  label = "Choose file",
}: {
  accept?: string;
  disabled?: boolean;
  onFile: (file: File) => void;
  label?: string;
}) {
  return (
    <label
      className={`inline-flex w-fit cursor-pointer items-center gap-2 rounded-md border border-navy bg-surface px-4 py-2.5 text-sm font-semibold text-navy transition hover:bg-surface-gray ${
        disabled ? "pointer-events-none opacity-50" : ""
      }`}
    >
      <Icon name="upload_file" size={18} />
      {label}
      <input
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.currentTarget.value = "";
        }}
        className="sr-only"
      />
    </label>
  );
}
