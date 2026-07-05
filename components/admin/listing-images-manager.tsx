"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { FileUploadButton } from "@/components/forms/file-upload-button";
import { deleteListingImage, reorderListingImages, uploadListingImages } from "@/app/admin/actions";

export type ListingImage = { id: string; url: string; alt_text: string | null; sort_order: number };

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.82;

function fileToResizedJpeg(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not read the image."));
      img.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / img.width, MAX_DIMENSION / img.height);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported."));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode image."))),
          "image/jpeg",
          JPEG_QUALITY
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function ListingImagesManager({
  listingId,
  initialImages,
}: {
  listingId: string;
  initialImages: ListingImage[];
}) {
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
        const blob = await fileToResizedJpeg(file);
        fd.append("files", blob, file.name.replace(/\.\w+$/, ".jpg"));
      }
      await uploadListingImages(listingId, fd);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed — please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove(id: string) {
    setImages((prev) => prev.filter((img) => img.id !== id));
    await deleteListingImage(id, listingId);
  }

  async function handleMove(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= images.length) return;
    const next = images.slice();
    [next[index], next[target]] = [next[target], next[index]];
    setImages(next);
    await reorderListingImages(
      listingId,
      next.map((img) => img.id)
    );
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-6">
      <h2 className="font-display text-sm font-semibold text-navy">Photos</h2>
      <p className="mt-1 text-xs text-slate">The first photo is used as the cover image on listing cards.</p>

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
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-navy/70 p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="flex gap-1">
                  <button
                    type="button"
                    aria-label="Move earlier"
                    disabled={i === 0}
                    onClick={() => handleMove(i, -1)}
                    className="flex h-7 w-7 items-center justify-center rounded text-white hover:bg-white/20 disabled:opacity-30"
                  >
                    <Icon name="arrow_back" size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label="Move later"
                    disabled={i === images.length - 1}
                    onClick={() => handleMove(i, 1)}
                    className="flex h-7 w-7 items-center justify-center rounded text-white hover:bg-white/20 disabled:opacity-30"
                  >
                    <Icon name="arrow_forward" size={16} />
                  </button>
                </div>
                <button
                  type="button"
                  aria-label="Remove photo"
                  onClick={() => handleRemove(img.id)}
                  className="flex h-7 w-7 items-center justify-center rounded text-white hover:bg-error/80"
                >
                  <Icon name="delete" size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <FileUploadButton
          accept="image/*"
          multiple
          disabled={uploading}
          onFile={() => {}}
          onFiles={handleFiles}
          label={uploading ? "Uploading…" : "Add photos"}
        />
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}
