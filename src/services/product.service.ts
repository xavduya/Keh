/**
 * Product service
 *
 * Provides data-access functions for products.
 * Currently backed by mock data. Replace with Supabase in Phase 5.
 */

import type { Product } from "@/types";
import { mockProducts } from "@/data/mock-products";

export async function getProducts(businessId: string): Promise<Product[]> {
  return mockProducts.filter((p) => p.businessId === businessId);
}

export async function getProductById(id: string): Promise<Product | null> {
  return mockProducts.find((p) => p.id === id) ?? null;
}
