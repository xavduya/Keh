"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentContext } from "@/lib/auth/context";
import { ProductFormSchema } from "@/lib/validation/schemas";
import { createProduct, getProductById, updateProduct } from "@/services/product.service";
import { submittedFile, uploadBusinessImage, validateImage } from "@/services/storage.service";

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
