import Image from "next/image";
import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PostStatusBadge } from "@/components/ui/post-status-badge";
import { mockProducts } from "@/data/mock-products";

function ProductCard({ product }: { product: typeof mockProducts[0] }) {
  return (
    <article className="bg-white rounded-[12px] border border-[#e9e9ef] overflow-hidden flex flex-col">
      <div className="relative w-full h-[220px]">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 33vw"
          unoptimized
        />
      </div>
      <div className="p-5 flex flex-col flex-1 gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-[#7b7b8b] font-[500]">{product.category}</span>
          <PostStatusBadge status={product.availability === "ACTIVE" ? "PUBLISHED" : "FAILED"} />
        </div>
        <div className="flex items-center justify-between mt-1">
          <h3 className="font-heading font-[750] text-[17px] text-[#262535]">{product.name}</h3>
          <span className="text-[17px] font-[700] text-[#5849da]">₱{product.price}</span>
        </div>
        <p className="text-[13px] text-[#7b7b8b] flex-1">{product.description}</p>
        <p className="text-[12px] text-[#7b7b8b]">
          Appeared in {product.campaignCount ?? 0} campaigns
        </p>
        <div className="flex gap-2 mt-auto pt-2">
          <Link
            href="/campaigns/new"
            className="px-3 py-2 rounded-[7px] bg-[#5849da] text-white text-[13px] font-[600] hover:bg-[#4a3cc7] transition-colors"
          >
            Create campaign
          </Link>
          <button className="px-3 py-2 rounded-[7px] border border-[#e9e9ef] text-[13px] font-[500] hover:bg-[#f7f8fb] transition-colors">
            Edit product
          </button>
        </div>
      </div>
    </article>
  );
}

export default function ProductsPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Products & services"
        subtitle="The more Keh knows, the less you have to explain."
        action={
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] bg-[#5849da] text-white text-[14px] font-[600] hover:bg-[#4a3cc7] transition-colors">
            <Plus size={15} />
            Add product
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <div className="bg-[#f0edff] text-[#5849da] rounded-lg px-4 py-3 text-[13px] flex items-center gap-2">
        <Sparkles size={14} />
        Product names, prices, and descriptions are automatically included in your campaign drafts.
      </div>
    </div>
  );
}
