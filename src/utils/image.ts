/**
 * Browser-side image preparation (client components only).
 *
 * Photos are resized and re-encoded before upload, so:
 *   - product photos are always JPG — the only format Instagram publishing
 *     accepts — whatever the owner picked (PNG, WebP, HEIC on iPhone…);
 *   - uploads stay small (a phone photo goes from ~5 MB to ~0.5 MB), well
 *     under serverless request limits (Vercel: ~4.5 MB per request).
 */

export interface PrepareImageOptions {
  /** "image/jpeg" for photos; "image/webp" keeps transparency (logos). */
  type: "image/jpeg" | "image/webp";
  /** Longest side in pixels. */
  maxSide: number;
  quality?: number;
}

export const PRODUCT_PHOTO: PrepareImageOptions = { type: "image/jpeg", maxSide: 2048, quality: 0.85 };
export const BRAND_IMAGE: PrepareImageOptions = { type: "image/webp", maxSide: 1600, quality: 0.9 };

const EXTENSIONS = { "image/jpeg": "jpg", "image/webp": "webp" } as const;

/**
 * Decodes, resizes and re-encodes an image. Throws if the browser can't
 * read it (e.g. HEIC outside Safari) — callers show a friendly message.
 */
export async function prepareImage(file: File, { type, maxSide, quality = 0.85 }: PrepareImageOptions): Promise<File> {
  // Respects the photo's EXIF orientation, so phone photos aren't sideways.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas isn't available");
    if (type === "image/jpeg") {
      // JPG has no transparency: put transparent PNGs on white, not black.
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
    }
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
    // Some browsers can't encode WebP and silently return PNG; accept that.
    if (!blob) throw new Error("Couldn't encode the image");
    const extension = blob.type === type ? EXTENSIONS[type] : blob.type.split("/")[1] ?? "png";
    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.${extension}`, { type: blob.type });
  } finally {
    bitmap.close();
  }
}

/** Puts a file on a real <input type="file"> so it submits with the form. */
export function setInputFile(input: HTMLInputElement, file: File) {
  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
}

/** Largest original we'll try to shrink (it's resized before upload). */
export const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024;
