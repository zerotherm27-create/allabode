"use client";

import { useActionState, useState } from "react";
import { Icon } from "@/components/icon";
import { PhotoCropper } from "@/components/team/photo-cropper";
import {
  uploadSpecialistPhoto,
  type SpecialistProfileState,
} from "@/app/dashboard/specialist/actions";

const idle: SpecialistProfileState = { ok: false, message: "" };

/** Style prompt for an AI image tool. Specialists attach their own photo where the tool allows it. */
const EDIT_PROMPT = `Professional corporate headshot portrait of a friendly real estate professional, vertical 4:5 composition.

Pose: seated or standing tall with relaxed shoulders, body angled about 25 degrees away from the camera, head turned back to face the lens, chin slightly forward and down, natural warm smile that reaches the eyes, looking straight into the camera. Hands and arms out of frame.

Framing: head and shoulders with a little chest, subject centred, clear space above the head, eyes about one third down from the top of the frame, face in the upper two-thirds.

Background: plain, softly blurred light neutral backdrop in warm off-white or soft grey, or a softly blurred bright modern office lobby. No dark, navy or black tones, no pure white, no busy details.

Lighting: soft, even, natural window-style light on the face, gentle shadows, no harsh glare, natural skin texture.

Clothing: smart business attire, such as a navy or charcoal blazer over a light shirt, clearly contrasting with the background.

Style: realistic photograph, 85mm portrait lens look, shallow depth of field, sharp focus on the eyes, natural colours, clean and professional. No text, watermark, logo, props, filters or extra people.`;

function EditPromptHelp() {
  const [copied, setCopied] = useState<"yes" | "no" | "failed">("no");
  async function copy() {
    try {
      await navigator.clipboard.writeText(EDIT_PROMPT);
      setCopied("yes");
      setTimeout(() => setCopied("no"), 2500);
    } catch {
      setCopied("failed");
    }
  }
  return (
    <details className="group mt-4 rounded-md border border-line bg-surface-gray">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-medium text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700">
        Want help getting the right look? Use this AI image prompt
        <Icon name="expand_more" size={18} className="shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-line px-4 pb-4 pt-3 text-sm text-slate">
        <p>
          Paste this prompt into an AI image tool (such as ChatGPT or Gemini) to get a photo in our style. Clients
          will meet you, so attach your own photo if the tool allows it and add: &ldquo;Use the person in the attached
          photo and keep my face unchanged.&rdquo; Check the result looks like you, then crop and save it here.
        </p>
        <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-md border border-line bg-surface p-3 text-xs text-ink">
          {EDIT_PROMPT}
        </pre>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={copy}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-surface px-4 text-sm font-medium text-navy transition-colors hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700"
          >
            <Icon name={copied === "yes" ? "check" : "content_copy"} size={18} />
            {copied === "yes" ? "Copied" : "Copy prompt"}
          </button>
          {copied === "failed" && (
            <span role="alert" className="text-sm text-error">
              Could not copy. Select the text above and copy it by hand.
            </span>
          )}
        </div>
        <p className="mt-3 text-xs">
          If the face changes, try again with &ldquo;do not alter my face&rdquo; repeated. If the background is too dark,
          add &ldquo;make the background one step lighter&rdquo;.
        </p>
      </div>
    </details>
  );
}

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
          <li>
            Pose: stand or sit tall with relaxed shoulders, angle your body slightly away and turn your head to the
            camera, chin slightly forward, with a natural, warm smile. Keep hands and arms relaxed or out of frame.
          </li>
          <li>Hold the phone at eye level (on a stand or held by someone else) and take plenty of shots.</li>
        </ul>

        <EditPromptHelp />

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
