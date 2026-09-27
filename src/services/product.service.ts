/**
 * Product service
 *
 * Provides data-access functions for products.
 * Currently backed by mock data. Replace with Supabase — until then every
 * business sees the same sample products (businessId is ignored).
 */

import type { Product } from "@/types";
import { mockProducts } from "@/data/mock-products";

export async function getProducts(businessId: string): Promise<Product[]> {
  void businessId;
  return mockProducts;
}

export async function getProductById(id: string): Promise<Product | null> {
  return mockProducts.find((p) => p.id === id) ?? null;
}
