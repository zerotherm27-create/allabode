export const PHOTO_W = 800;
export const PHOTO_H = 1000;

export function computeCenterCrop(srcW: number, srcH: number) {
  let width = srcW;
  let height = Math.floor((srcW * PHOTO_H) / PHOTO_W);
  if (height > srcH) {
    height = srcH;
    width = Math.floor((srcH * PHOTO_W) / PHOTO_H);
  }
  return {
    x: Math.floor((srcW - width) / 2),
    y: Math.floor((srcH - height) / 2),
    width,
    height,
  };
}

export function jpegDimensions(
  buf: Uint8Array,
): { width: number; height: number } | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 3 < buf.length) {
    if (buf[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = buf[i + 1];
    if (marker === 0xff) {
      i++;
      continue;
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    if (marker === 0xd9) return null;
    const len = (buf[i + 2] << 8) | buf[i + 3];
    const isSof =
      marker >= 0xc0 && marker <= 0xcf &&
      marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      if (i + 8 >= buf.length) return null;
      return {
        height: (buf[i + 5] << 8) | buf[i + 6],
        width: (buf[i + 7] << 8) | buf[i + 8],
      };
    }
    i += 2 + len;
  }
  return null;
}
