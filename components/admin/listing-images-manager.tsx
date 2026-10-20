"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { FileUploadButton } from "@/components/forms/file-upload-button";
import { GoogleDrivePickerButton } from "@/components/admin/google-drive-picker-button";
import { deleteListingImage, reorderListingImages, uploadListingImages } from "@/app/admin/actions";
import { optimizeImageFile } from "@/lib/image-optimize";

export type ListingImage = { id: string; url: string; alt_text: string | null; sort_order: number };

/** The server actions behind the manager. Defaults to the admin ones; the
 *  specialist pages pass their own, which check ownership and revalidate their
 *  own paths. */
export type ListingImageActions = {
  upload: (listingId: string, fd: FormData) => Promise<unknown>;
  remove: (imageId: string, listingId: string) => Promise<unknown>;
  reorder: (listingId: string, orderedIds: string[]) => Promise<unknown>;
};

const ADMIN_ACTIONS: ListingImageActions = {
  upload: uploadListingImages,
  remove: deleteListingImage,
  reorder: reorderListingImages,
};

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

export function ListingImagesManager({
  listingId,
  initialImages,
  actions = ADMIN_ACTIONS,
  variant = "admin",
}: {
  listingId: string;
  initialImages: ListingImage[];
  actions?: ListingImageActions;
  /** "specialist": prominent heading, an empty state, and always-visible touch-sized controls. */
  variant?: "admin" | "specialist";
}) {
  const specialist = variant === "specialist";
  const btnSize = specialist ? "h-11 w-11" : "h-7 w-7";
  const [prevInitialImages, setPrevInitialImages] = useState(initialImages);
  const [images, setImages] = useState(initialImages);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  if (initialImages !== prevInitialImages) {
    setPrevInitialImages(initialImages);
    setImages(initialImages);
  }

  async function handleFiles(files: File[]) {
    setError("");
    const oversize = files.find((f) => f.size > MAX_UPLOAD_SIZE);
    if (oversize) {
      setError(`"${oversize.name}" is over 10 MB — please choose a smaller image.`);
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      for (const file of files) {
        const blob = await optimizeImageFile(file);
        fd.append("files", blob, file.name.replace(/\.\w+$/, ".jpg"));
      }
      await actions.upload(listingId, fd);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed — please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove(id: string) {
    setError("");
    try {
      await actions.remove(id, listingId);
      setImages((prev) => prev.filter((img) => img.id !== id));
    } catch {
      setError("Couldn't remove that photo. Try again.");
    }
  }

  async function handleMove(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= images.length) return;
    const next = images.slice();
    [next[index], next[target]] = [next[target], next[index]];
    setImages(next);
    await actions.reorder(
      listingId,
      next.map((img) => img.id)
    );
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-6">
      <h2 className={specialist ? "font-display text-lg font-semibold text-navy" : "font-display text-sm font-semibold text-navy"}>
        Photos
      </h2>
      <p className={specialist ? "mt-1 text-sm text-slate" : "mt-1 text-xs text-slate"}>
        The first photo is used as the cover image on listing cards.
      </p>
      {specialist && images.length === 0 && (
        <p className="mt-4 rounded-md border border-dashed border-line bg-cream px-4 py-6 text-center text-sm text-slate">
          No photos yet — add at least one before submitting
        </p>
      )}

      {images.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {images.map((img, i) => (
            <div key={img.id} className="group relative overflow-hidden rounded-md border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.alt_text ?? ""} className="aspect-[4/3] w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-2 top-2 rounded-full bg-navy/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  Cover
                </span>
              )}
              <div className={`absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-navy/70 p-1.5 transition-opacity ${specialist ? "" : "opacity-0 group-hover:opacity-100"}`}>
                <div className="flex gap-1">
                  <button
                    type="button"
                    aria-label="Move earlier"
                    disabled={i === 0}
                    onClick={() => handleMove(i, -1)}
                    className={`flex ${btnSize} items-center justify-center rounded text-white hover:bg-white/20 disabled:opacity-30`}
                  >
                    <Icon name="arrow_back" size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label="Move later"
                    disabled={i === images.length - 1}
                    onClick={() => handleMove(i, 1)}
                    className={`flex ${btnSize} items-center justify-center rounded text-white hover:bg-white/20 disabled:opacity-30`}
                  >
                    <Icon name="arrow_forward" size={16} />
                  </button>
                </div>
                <button
                  type="button"
                  aria-label="Remove photo"
                  onClick={() => handleRemove(img.id)}
                  className={`flex ${btnSize} items-center justify-center rounded text-white hover:bg-error/80`}
                >
                  <Icon name="delete" size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <FileUploadButton
          accept="image/*"
          multiple
          disabled={uploading}
          onFile={() => {}}
          onFiles={handleFiles}
          label={uploading ? "Uploading…" : "Add photos"}
          className={specialist ? "min-h-11" : ""}
        />
        <GoogleDrivePickerButton disabled={uploading} onFiles={handleFiles} onError={setError} />
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}
