/** Tiles a semi-transparent, rotated wordmark across the canvas so it can't be
 *  cropped out without visibly damaging the photo. Baked into the pixels at
 *  upload time — persists no matter how the file is later served. */
function drawWatermark(ctx: CanvasRenderingContext2D, width: number, height: number, text: string) {
  ctx.save();
  ctx.font = `600 ${Math.max(14, Math.round(width / 28))}px sans-serif`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
  ctx.strokeStyle = "rgba(10, 20, 35, 0.12)";
  ctx.lineWidth = 1;
  ctx.textBaseline = "middle";
  ctx.rotate((-28 * Math.PI) / 180);
  const stepX = ctx.measureText(text).width + width * 0.22;
  const stepY = Math.max(90, height * 0.19);
  // Rotated coordinate space is larger than the canvas — overshoot the tiling
  // grid on all sides so corners get covered too.
  const span = width + height;
  for (let y = -span; y < span; y += stepY) {
    for (let x = -span; x < span; x += stepX) {
      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);
    }
  }
  ctx.restore();
}

/** Client-only. Resizes + re-encodes an image file via canvas so uploads are
 *  smaller and pages load faster — call this before handing a file to
 *  Supabase Storage, not after. Never upscales; images already under
 *  `maxDimension` just get re-encoded at `quality` (still shrinks most
 *  camera-straight-from-phone JPEGs/PNGs significantly). Pass `watermark` to
 *  bake a tiled wordmark into the image itself (listing photos only — not
 *  used for hero backgrounds etc.). */
export function optimizeImageFile(
  file: File,
  {
    maxDimension = 1920,
    quality = 0.82,
    watermark,
  }: { maxDimension?: number; quality?: number; watermark?: string } = {}
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not read the image."));
      img.onload = () => {
        const scale = Math.min(1, maxDimension / img.width, maxDimension / img.height);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported."));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        if (watermark) drawWatermark(ctx, canvas.width, canvas.height, watermark);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode image."))),
          "image/jpeg",
          quality
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
