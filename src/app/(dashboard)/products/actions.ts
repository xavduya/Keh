"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentContext } from "@/lib/auth/context";
import { ProductFormSchema } from "@/lib/validation/schemas";
import { createProduct, deleteProduct, getProductById, updateProduct } from "@/services/product.service";
import { countCampaignsForProduct } from "@/services/campaign.service";
import { deleteImageByUrl, submittedFile, uploadBusinessImage, validateImage } from "@/services/storage.service";

export type ProductFormState =
  | {
      success?: boolean;
      error?: string;
      fieldErrors?: Record<string, string[] | undefined>;
    }
  | undefined;

/** Creates a product, or updates it when the form includes an `id`. */
export async function saveProduct(
  _state: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const { business } = await getCurrentContext();

  const parsed = ProductFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const image = submittedFile(formData.get("image"));
  const imageError = image && validateImage(image);
  if (imageError) {
    return { fieldErrors: { image: [imageError] } };
  }

  const id = formData.get("id");
  try {
    // RLS already limits updates to the owner's products; this check turns
    // a foreign or stale ID into a clear message instead of a silent no-op.
    if (typeof id === "string" && id) {
      const existing = await getProductById(id);
      if (!existing || existing.businessId !== business.id) {
        return { error: "That product no longer exists." };
      }
    }

    const imageUrl = image ? await uploadBusinessImage(business.id, image) : undefined;

    if (typeof id === "string" && id) {
      await updateProduct(id, parsed.data, imageUrl);
    } else {
      await createProduct(business.id, parsed.data, imageUrl ?? "");
    }
  } catch (err) {
    console.error("saveProduct failed", err);
    return { error: "We couldn't save that product. Please try again." };
  }

  revalidatePath("/products");
  revalidatePath("/campaigns/new");
  return { success: true };
}

/**
 * Deletes a product and its photo. Products used by a campaign can't be
 * deleted (the campaign still shows them); the owner can mark them
 * unavailable instead.
 */
export async function removeProduct(productId: string): Promise<{ error?: string }> {
  const { business } = await getCurrentContext();
  try {
    const product = typeof productId === "string" && productId ? await getProductById(productId) : null;
    if (!product || product.businessId !== business.id) return { error: "That product no longer exists." };

    const used = await countCampaignsForProduct(business.id, product.id);
    if (used > 0) {
      return {
        error: `${product.name} is used in ${used} campaign${used === 1 ? "" : "s"}, so it can't be deleted. Set it to "Unavailable" instead, or delete those campaigns first.`,
      };
    }

    await deleteProduct(business.id, product.id);
    if (product.imageUrl) await deleteImageByUrl(product.imageUrl);
  } catch (err) {
    console.error("removeProduct failed", err);
    return { error: "We couldn't delete that product. Please try again." };
  }

  revalidatePath("/products");
  revalidatePath("/campaigns/new");
  return {};
}
