/**
 * Mock products data
 *
 * Extracted from the prototype's state.products array.
 * Replace with a Supabase query in Phase 5.
 *
 * NOTE: Images currently reference Unsplash CDN URLs from the prototype.
 * These should be moved to Supabase Storage or /public in Phase 5.
 */

import type { Product } from "@/types";

export const mockProducts: Product[] = [
  {
    id: "prod_001",
    businessId: "biz_001",
    name: "Matcha Latte",
    description: "Creamy Japanese matcha with fresh milk, served over ice.",
    price: 150,
    category: "Drinks",
    imageUrl:
      "https://images.unsplash.com/photo-1749280447307-31a68eb38673?auto=format&fit=crop&w=800&q=85",
    availability: "ACTIVE",
    aiNotes: "Our student favorite. Show preparation and the price.",
    campaignCount: 8,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "prod_002",
    businessId: "biz_001",
    name: "Spanish Latte",
    description: "Espresso, milk, and a little sweetness.",
    price: 140,
    category: "Drinks",
    imageUrl:
      "https://images.unsplash.com/photo-1684548856346-041e1a90d630?auto=format&fit=crop&w=800&q=85",
    availability: "ACTIVE",
    campaignCount: 5,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "prod_003",
    businessId: "biz_001",
    name: "Butter Croissant",
    description: "Flaky, buttery, and freshly baked.",
    price: 95,
    category: "Pastries",
    imageUrl:
      "https://images.unsplash.com/photo-1725545901708-27d59e5c4226?auto=format&fit=crop&w=800&q=85",
    availability: "ACTIVE",
    campaignCount: 3,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];
