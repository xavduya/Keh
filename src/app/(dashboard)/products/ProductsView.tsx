"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ImageIcon, Plus, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { AvailabilityBadge } from "@/components/ui/availability-badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/utils";
import type { Product } from "@/types";
import { ProductDialog } from "./ProductDialog";

/** null = closed, "new" = adding, Product = editing */
type DialogState = null | "new" | Product;

function ProductCard({ product, onEdit }: { product: Product; onEdit: () => void }) {
  const hasPromo = product.promoPrice !== undefined && product.promoPrice < product.price;

  return (
    <article className="bg-white rounded-xl border border-brand-line overflow-hidden flex flex-col">
      <div className="relative w-full h-[220px] bg-brand-bg">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-brand-muted">
            <ImageIcon size={32} aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="p-5 flex flex-col flex-1 gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-brand-muted font-medium">
            {product.category || "Uncategorized"}
          </span>
          <AvailabilityBadge availability={product.availability} />
        </div>
        <div className="flex items-baseline justify-between gap-3 mt-1">
          <h3 className="font-heading font-bold text-[17px] text-brand-dark">{product.name}</h3>
          <span className="text-right shrink-0">
            {hasPromo && (
              <span className="text-[13px] text-brand-muted line-through mr-1.5">
                {formatPrice(product.price)}
              </span>
            )}
            <span className="text-[17px] font-bold text-brand">
              {formatPrice(hasPromo ? product.promoPrice! : product.price)}
            </span>
          </span>
        </div>
        <p className="text-[13px] text-brand-muted flex-1">{product.description}</p>
        <p className="text-[12px] text-brand-muted">
          Appeared in {product.campaignCount ?? 0} campaigns
        </p>
        <div className="flex gap-2 mt-auto pt-2">
          <Link
            href={`/campaigns/new?product=${product.id}`}
            className="px-3 py-2 rounded-[7px] bg-brand text-white text-[13px] font-semibold hover:bg-[#4a3cc7] transition-colors"
          >
            Create campaign
          </Link>
          <button
            type="button"
            onClick={onEdit}
            className="px-3 py-2 rounded-[7px] border border-brand-line text-[13px] font-medium hover:bg-brand-bg transition-colors"
          >
            Edit product
          </button>
        </div>
      </div>
    </article>
  );
}

export function ProductsView({ products }: { products: Product[] }) {
  const [dialog, setDialog] = useState<DialogState>(null);

  const addButton = (
    <Button onClick={() => setDialog("new")} className="h-9 px-4 text-[14px] font-semibold">
      <Plus size={15} />
      Add product
    </Button>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Products & services"
        subtitle="The more Keh knows, the less you have to explain."
        action={addButton}
      />

      {products.length === 0 ? (
        <EmptyState
          title="Add your first product"
          description="Every campaign spotlights something you sell. Add a product or service with a photo and price, and Keh will write about it for you."
          action={addButton}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} onEdit={() => setDialog(product)} />
          ))}
        </div>
      )}

      <div className="bg-brand-light text-brand rounded-lg px-4 py-3 text-[13px] flex items-center gap-2">
        <Sparkles size={14} aria-hidden="true" />
        Product names, prices, and descriptions are automatically included in your campaign drafts.
      </div>

      {dialog && (
        <ProductDialog
          key={dialog === "new" ? "new" : dialog.id}
          product={dialog === "new" ? null : dialog}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
