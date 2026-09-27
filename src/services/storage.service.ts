/**
 * Storage service
 *
 * Uploads business images (product photos, brand logo, brand image) to
 * Supabase Storage. Files live under "<business_id>/…" in the public
 * `product-images` bucket; RLS on storage.objects only allows writes inside
 * the folder of a business the user owns (migration 008).
 */

import { createServerClient } from "@/lib/supabase/server";
import { MAX_UPLOAD_BYTES } from "@/constants";

const IMAGE_BUCKET = "product-images";
/** Allowed image types and the extension each is stored with. */
const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const ALLOWED_IMAGE_TYPES = Object.keys(IMAGE_EXTENSIONS);

/** Returns the file if a non-empty file was submitted, else null. */
export function submittedFile(value: FormDataEntryValue | null): File | null {
  return value instanceof File && value.size > 0 ? value : null;
}

/** Returns a user-facing error message, or null if the image is acceptable. */
export function validateImage(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return "Use a JPG, PNG, WebP or GIF image.";
  if (file.size > MAX_UPLOAD_BYTES) return "Images must be 5 MB or smaller.";
  return null;
}

/**
 * Uploads an image under the business's folder and returns its public URL.
 * @param subfolder optional path segment inside the business folder, e.g. "brand"
 */
export async function uploadBusinessImage(
  businessId: string,
  file: File,
  subfolder?: string
): Promise<string> {
  const supabase = await createServerClient();
  // From the checked type, not the file name: "photo.html" can't become a stored .html file.
  const ext = IMAGE_EXTENSIONS[file.type] ?? "jpg";
  const path = [businessId, subfolder, `${crypto.randomUUID()}.${ext}`]
    .filter(Boolean)
    .join("/");

  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type });
  if (error) throw error;

  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}
