/**
 * Storage service
 *
 * Uploads business images (product photos, brand logo, brand image) to
 * Supabase Storage. Files live under "<business_id>/…" in the public
 * `product-images` bucket; RLS on storage.objects only allows writes inside
 * the folder of a business the user owns (migration 008).
 */

import { createAdminClient, createServerClient } from "@/lib/supabase/server";
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

/**
 * Deletes every image under a business's folder (product photos and the
 * "brand" subfolder). Server-only: runs with the secret key, for account
 * deletion. Best effort — errors are logged, not thrown.
 */
export async function deleteBusinessImages(businessId: string): Promise<void> {
  const storage = createAdminClient().storage.from(IMAGE_BUCKET);
  for (const folder of [businessId, `${businessId}/brand`]) {
    const { data, error } = await storage.list(folder, { limit: 1000 });
    if (error) {
      console.error("Could not list images to delete", folder, error.message);
      continue;
    }
    // Sub-folders are listed with a null id; only remove files.
    const paths = data.filter((item) => item.id !== null).map((item) => `${folder}/${item.name}`);
    if (paths.length === 0) continue;
    const { error: removeError } = await storage.remove(paths);
    if (removeError) console.error("Could not delete images", folder, removeError.message);
  }
}

/** Removes an image this app uploaded, given its public URL. Best effort; other URLs are ignored. */
export async function deleteImageByUrl(url: string): Promise<void> {
  const marker = `/storage/v1/object/public/${IMAGE_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index < 0) return;
  const path = decodeURIComponent(url.slice(index + marker.length));
  const supabase = await createServerClient();
  const { error } = await supabase.storage.from(IMAGE_BUCKET).remove([path]);
  if (error) console.error("Could not delete image", path, error.message);
}
