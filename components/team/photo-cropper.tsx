"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PHOTO_H, PHOTO_W, computeCenterCrop } from "@/lib/team/photo";

const PREVIEW_W = 320;
const PREVIEW_H = 400;
const TOO_SMALL = "Choose a larger photo (at least 800 × 1000 px)";

type Loaded = { img: HTMLImageElement; w: number; h: number };

/**
 * File input, fixed 4:5 frame, drag to reposition, zoom slider. "Use this
 * crop" hands an 800 x 1000 JPEG blob to onCropped.
 */
export function PhotoCropper({ onCropped }: { onCropped: (blob: Blob) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const urlRef = useRef<string | null>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [src, setSrc] = useState<Loaded | null>(null);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);
  // Crop centre in source pixels.
  const [center, setCenter] = useState({ x: 0, y: 0 });
  const [done, setDone] = useState(false);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  // Crop rectangle for the current zoom/centre, clamped inside the source.
  const rect = useCallback(
    (s: Loaded, z: number, c: { x: number; y: number }) => {
      const base = computeCenterCrop(s.w, s.h);
      const width = base.width / z;
      const height = base.height / z;
      const x = Math.min(Math.max(c.x - width / 2, 0), s.w - width);
      const y = Math.min(Math.max(c.y - height / 2, 0), s.h - height);
      return { x, y, width, height };
    },
    [],
  );

  // Never crop below the output size (no upscaling).
  const maxZoom = src ? Math.max(1, computeCenterCrop(src.w, src.h).width / PHOTO_W) : 1;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !src) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const r = rect(src, zoom, center);
    ctx.drawImage(src.img, r.x, r.y, r.width, r.height, 0, 0, PREVIEW_W, PREVIEW_H);
  }, [src, zoom, center, rect]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    setDone(false);
    setError("");
    setSrc(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (w <= 0 || h <= 0) {
        setError("That image couldn't be read.");
        return;
      }
      if (w < PHOTO_W || h < PHOTO_H) {
        setError(TOO_SMALL);
        return;
      }
      const crop = computeCenterCrop(w, h);
      setCenter({ x: crop.x + crop.width / 2, y: crop.y + crop.height / 2 });
      setZoom(1);
      setSrc({ img, w, h });
    };
    img.onerror = () => setError("That image couldn't be read.");
    img.src = url;
  }

  function moveBy(dxSrc: number, dySrc: number) {
    if (!src) return;
    setDone(false);
    setCenter((c) => {
      const r = rect(src, zoom, c);
      return {
        x: Math.min(Math.max(c.x + dxSrc, r.width / 2), src.w - r.width / 2),
        y: Math.min(Math.max(c.y + dySrc, r.height / 2), src.h - r.height / 2),
      };
    });
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!src) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!src || !drag.current) return;
    const bounds = e.currentTarget.getBoundingClientRect();
    const r = rect(src, zoom, center);
    const scale = r.width / bounds.width;
    moveBy(-(e.clientX - drag.current.x) * scale, -(e.clientY - drag.current.y) * scale);
    drag.current = { x: e.clientX, y: e.clientY };
  }
  function onKeyDown(e: React.KeyboardEvent<HTMLCanvasElement>) {
    if (!src) return;
    const step = rect(src, zoom, center).width / 40;
    const d: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const m = d[e.key];
    if (m) {
      e.preventDefault();
      moveBy(m[0], m[1]);
    }
  }

  function confirm() {
    if (!src) return;
    const out = document.createElement("canvas");
    out.width = PHOTO_W;
    out.height = PHOTO_H;
    const ctx = out.getContext("2d");
    if (!ctx) {
      setError("Your browser can't crop images.");
      return;
    }
    const r = rect(src, zoom, center);
    ctx.drawImage(src.img, r.x, r.y, r.width, r.height, 0, 0, PHOTO_W, PHOTO_H);
    out.toBlob(
      (blob) => {
        if (!blob) {
          setError("The photo couldn't be prepared. Try another one.");
          return;
        }
        setError("");
        setDone(true);
        onCropped(blob);
      },
      "image/jpeg",
      0.9,
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-navy">
        Choose a photo
        <input
          type="file"
          accept="image/*"
          onChange={onFile}
          className="min-h-11 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink file:mr-3 file:min-h-8 file:rounded-md file:border-0 file:bg-navy file:px-3 file:text-sm file:font-semibold file:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700"
        />
      </label>

      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}

      {src && (
        <>
          <canvas
            ref={canvasRef}
            width={PREVIEW_W}
            height={PREVIEW_H}
            tabIndex={0}
            role="img"
            aria-label="Photo crop preview. Drag or use the arrow keys to reposition."
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
            onKeyDown={onKeyDown}
            className="aspect-[4/5] w-full max-w-[320px] cursor-grab touch-none rounded-md border border-line active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700"
          />
          <label className="flex max-w-[320px] flex-col gap-1.5 text-sm font-medium text-navy">
            Zoom
            <input
              type="range"
              min={1}
              max={maxZoom}
              step={0.01}
              value={zoom}
              disabled={maxZoom <= 1}
              onChange={(e) => {
                setDone(false);
                setZoom(Number(e.currentTarget.value));
              }}
              className="h-11 w-full accent-navy"
            />
          </label>
          <button
            type="button"
            onClick={confirm}
            className="inline-flex min-h-11 w-fit items-center justify-center rounded-md border border-navy px-5 text-sm font-semibold text-navy transition-colors hover:bg-navy/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700"
          >
            Use this crop
          </button>
          {done && (
            <p role="status" className="text-sm text-available">
              Crop ready. Save the photo to upload it.
            </p>
          )}
        </>
      )}
    </div>
  );
}
