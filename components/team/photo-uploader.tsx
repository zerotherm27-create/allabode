"use client";

import { useActionState, useState } from "react";
import { PhotoCropper } from "@/components/team/photo-cropper";
import {
  uploadSpecialistPhoto,
  type SpecialistProfileState,
} from "@/app/dashboard/specialist/actions";

const idle: SpecialistProfileState = { ok: false, message: "" };

export function PhotoUploader({ currentUrl }: { currentUrl: string | null }) {
  const [state, action, pending] = useActionState(uploadSpecialistPhoto, idle);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [showMessage, setShowMessage] = useState(false);

  return (
    <div className="flex flex-col gap-5 sm:flex-row">
      <div className="shrink-0">
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentUrl}
            alt="Your current portrait"
            width={160}
            height={200}
            className="h-[200px] w-[160px] rounded-md border border-line object-cover"
          />
        ) : (
          <div className="flex h-[200px] w-[160px] items-center justify-center rounded-md border border-dashed border-line bg-surface-gray p-3 text-center text-xs text-slate">
            No photo yet
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <ul className="list-disc pl-5 text-sm text-slate">
          <li>Use a tall portrait photo (4:5), JPEG, 1.5 MB or smaller. The cropper below sets the shape.</li>
          <li>
            Plain light-to-mid background (soft grey, off-white, cream, or a softly blurred office). Avoid
            navy, black or very dark backdrops, busy scenes and pure white.
          </li>
          <li>Face a window or shoot in good light.</li>
          <li>Frame head and shoulders, looking at the camera, with some space above your head.</li>
          <li>Keep your face in the top two-thirds so the team page crop does not cut it off.</li>
          <li>Wear something that contrasts with the background. No sunglasses, heavy filters or group shots.</li>
        </ul>

        <div className="mt-4">
          <PhotoCropper
            onCropped={(b) => {
              setBlob(b);
              setShowMessage(false);
            }}
            onReset={() => {
              setBlob(null);
              setShowMessage(false);
            }}
          />
        </div>

        <form
          action={(fd) => {
            if (!blob) return;
            setShowMessage(true);
            fd.set("photo", new File([blob], "portrait.jpg", { type: "image/jpeg" }));
            action(fd);
          }}
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <button
            type="submit"
            disabled={!blob || pending}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-navy px-6 text-sm font-semibold text-white transition-colors hover:bg-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Uploading…" : "Save photo"}
          </button>
          <p
            role={showMessage && state.message ? (state.ok ? "status" : "alert") : undefined}
            className={`text-sm ${state.ok ? "text-available" : "text-error"}`}
          >
            {showMessage ? state.message : ""}
          </p>
        </form>
      </div>
    </div>
  );
}
