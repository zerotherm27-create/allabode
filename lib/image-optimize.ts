/** Client-only. Resizes + re-encodes an image file via canvas so uploads are
 *  smaller and pages load faster — call this before handing a file to
 *  Supabase Storage, not after. Never upscales; images already under
 *  `maxDimension` just get re-encoded at `quality` (still shrinks most
 *  camera-straight-from-phone JPEGs/PNGs significantly). */
export function optimizeImageFile(
  file: File,
  {
    maxDimension = 1920,
    quality = 0.82,
  }: { maxDimension?: number; quality?: number } = {}
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
