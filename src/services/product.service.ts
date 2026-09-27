/**
 * Product service
 *
 * Data-access functions for products. Backed by Supabase — RLS scopes every
 * query to businesses owned by the signed-in user.
 */

import type { Product } from "@/types";
import type { ProductRow, InsertProduct } from "@/lib/supabase/database.types";
import { createServerClient } from "@/lib/supabase/server";

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    promoPrice: row.promo_price === null ? undefined : Number(row.promo_price),
    category: row.category,
    imageUrl: row.image_url,
    productUrl: row.product_url ?? undefined,
    availability: row.availability,
    aiNotes: row.ai_notes ?? undefined,
    campaignCount: row.campaign_count,
    createdAt: row.created_at,
  };
}

export async function getProducts(businessId: string): Promise<Product[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data.map(toProduct);
}

export async function getProductById(id: string): Promise<Product | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? toProduct(data) : null;
}

export interface ProductInput {
  name: string;
  description: string;
  price: number;
  promoPrice?: number;
  category: string;
  productUrl: string;
  availability: Product["availability"];
  aiNotes: string;
}

function toRowFields(
  input: ProductInput
): Omit<InsertProduct, "business_id" | "image_url"> {
  return {
    name: input.name,
    description: input.description,
    price: input.price,
    promo_price: input.promoPrice ?? null,
    category: input.category,
    product_url: input.productUrl || null,
    availability: input.availability,
    ai_notes: input.aiNotes || null,
  };
}

export async function createProduct(
  businessId: string,
  input: ProductInput,
  imageUrl: string
): Promise<Product> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("products")
    .insert({
      ...toRowFields(input),
      business_id: businessId,
      image_url: imageUrl,
    })
    .select("*")
    .single();

  if (error) throw error;
  return toProduct(data);
}

export async function updateProduct(
  id: string,
  input: ProductInput,
  imageUrl?: string
): Promise<Product> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("products")
    .update({
      ...toRowFields(input),
      ...(imageUrl !== undefined && { image_url: imageUrl }),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return toProduct(data);
}

/** Deletes a product. Fails (FK restrict) if a campaign still uses it — check first. */
export async function deleteProduct(businessId: string, id: string): Promise<void> {
  const supabase = await createServerClient();
  const { error } = await supabase.from("products").delete().eq("id", id).eq("business_id", businessId);
  if (error) throw error;
}
