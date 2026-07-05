"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { FileUploadButton } from "@/components/forms/file-upload-button";

export type SignatureInputHandle = {
  isEmpty: () => boolean;
  getDataUrl: () => string | null;
  clear: () => void;
};

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
const MAX_WIDTH = 600;
const MAX_HEIGHT = 200;

/** Reads an image file, scales it down onto an offscreen canvas, and returns
 * a PNG data URI comparable in size to a drawn signature — so an uploaded
 * phone-camera photo doesn't risk the request-body-size limit that already
 * bit ID uploads once (that fix used a separate storage upload; signatures
 * go inline as a data URI, so shrinking client-side is the equivalent fix). */
function fileToResizedDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not read the image."));
      img.onload = () => {
        const scale = Math.min(1, MAX_WIDTH / img.width, MAX_HEIGHT / img.height);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas not supported.")); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export const SignatureInput = forwardRef<SignatureInputHandle>(function SignatureInput(_props, ref) {
  const [mode, setMode] = useState<"draw" | "upload">("draw");
  const [uploadedDataUrl, setUploadedDataUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const padRef = useRef<SignatureCanvas>(null);

  useImperativeHandle(ref, () => ({
    isEmpty: () => (mode === "draw" ? !padRef.current || padRef.current.isEmpty() : !uploadedDataUrl),
    getDataUrl: () => (mode === "draw" ? padRef.current?.toDataURL("image/png") ?? null : uploadedDataUrl),
    clear: () => {
      padRef.current?.clear();
      setUploadedDataUrl(null);
    },
  }));

  async function handleFile(file: File) {
    setError("");
    if (file.size > MAX_UPLOAD_SIZE) {
      setError("Image must be under 10 MB.");
      return;
    }
    try {
      setUploadedDataUrl(await fileToResizedDataUrl(file));
    } catch {
      setError("Couldn't read that image — please try another file.");
    }
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-3 text-xs">
        <button
          type="button"
          onClick={() => setMode("draw")}
          className={mode === "draw" ? "font-semibold text-navy underline" : "text-slate hover:text-navy"}
        >
          Draw
        </button>
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={mode === "upload" ? "font-semibold text-navy underline" : "text-slate hover:text-navy"}
        >
          Upload image
        </button>
      </div>

      {mode === "draw" ? (
        <>
          <div className="overflow-hidden rounded-md border border-line bg-surface-gray">
            <SignatureCanvas ref={padRef} penColor="#0a2540" canvasProps={{ className: "h-40 w-full" }} />
          </div>
          <button type="button" onClick={() => padRef.current?.clear()} className="mt-1 text-xs font-medium text-slate hover:text-navy">
            Clear
          </button>
        </>
      ) : (
        <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-md border border-line bg-surface-gray p-3">
          {uploadedDataUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={uploadedDataUrl} alt="Uploaded signature" className="max-h-28 max-w-full object-contain" />
              <button type="button" onClick={() => setUploadedDataUrl(null)} className="text-xs font-medium text-slate hover:text-navy">
                Remove
              </button>
            </>
          ) : (
            <FileUploadButton accept="image/*" onFile={handleFile} label="Upload signature image" />
          )}
        </div>
      )}
      {error && <p role="alert" className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
});
