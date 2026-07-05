"use client";

import { Icon } from "@/components/icon";

export function FileUploadButton({
  accept,
  disabled,
  multiple,
  onFile,
  onFiles,
  label = "Choose file",
}: {
  accept?: string;
  disabled?: boolean;
  /** Allow selecting more than one file at once. Use with `onFiles`. */
  multiple?: boolean;
  onFile: (file: File) => void;
  /** Called instead of `onFile` when `multiple` is set and files are selected. */
  onFiles?: (files: File[]) => void;
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
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (multiple && onFiles) onFiles(files);
          else if (files[0]) onFile(files[0]);
          e.currentTarget.value = "";
        }}
        className="sr-only"
      />
    </label>
  );
}
