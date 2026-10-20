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
          <li>Use a plain background.</li>
          <li>Face a window or shoot in good light.</li>
          <li>Frame head and shoulders, looking at the camera.</li>
        </ul>

        <div className="mt-4">
          <PhotoCropper onCropped={setBlob} />
        </div>

        <form
          action={(fd) => {
            if (!blob) return;
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
            role={state.message ? (state.ok ? "status" : "alert") : undefined}
            className={`text-sm ${state.ok ? "text-available" : "text-error"}`}
          >
            {state.message}
          </p>
        </form>
      </div>
    </div>
  );
}
