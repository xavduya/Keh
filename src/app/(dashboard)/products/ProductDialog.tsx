"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Product } from "@/types";
import { saveProduct, type ProductFormState } from "./actions";

interface ProductDialogProps {
  /** null when adding a new product */
  product: Product | null;
  onClose: () => void;
}

const inputClass =
  "px-3 py-2 border border-brand-line rounded-lg text-[14px] bg-white focus-visible:outline-2 focus-visible:outline-brand aria-invalid:border-destructive";

function Field({
  label,
  name,
  errors,
  children,
  className = "",
}: {
  label: string;
  name: string;
  errors?: string[];
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[13px] font-semibold text-brand-dark">{label}</span>
      {children}
      {errors && (
        <span id={`${name}-error`} className="text-[12px] text-destructive">
          {errors[0]}
        </span>
      )}
    </label>
  );
}

export function ProductDialog({ product, onClose }: ProductDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Close the dialog as part of a successful save.
  async function action(state: ProductFormState, formData: FormData) {
    const result = await saveProduct(state, formData);
    if (result?.success) onClose();
    return result;
  }
  const [state, formAction, pending] = useActionState(action, undefined);

  // Submit via a transition instead of <form action>: React resets
  // action-driven forms after every submit, which would wipe the user's
  // input whenever validation fails.
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  }
  const errors = state?.fieldErrors ?? {};

  // Native <dialog> gives us focus trapping, Escape-to-close and a backdrop.
  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const invalid = (name: string) =>
    errors[name]
      ? { "aria-invalid": true as const, "aria-describedby": `${name}-error` }
      : {};

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="product-dialog-title"
      className="m-auto w-[calc(100%-32px)] max-w-[560px] rounded-xl border border-brand-line p-0 backdrop:bg-black/30"
    >
      <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <h2 id="product-dialog-title" className="font-heading font-bold text-[20px] text-brand-dark">
            {product ? "Edit product" : "Add a product"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-lg text-brand-muted hover:bg-brand-bg"
          >
            <X size={18} />
          </button>
        </div>

        {product && <input type="hidden" name="id" value={product.id} />}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name" name="name" errors={errors.name} className="sm:col-span-2">
            <input name="name" defaultValue={product?.name} placeholder="e.g. Matcha Latte" className={inputClass} {...invalid("name")} />
          </Field>

          <Field label="Price (₱)" name="price" errors={errors.price}>
            <input name="price" type="number" inputMode="decimal" min="0" step="0.01" defaultValue={product?.price} className={inputClass} {...invalid("price")} />
          </Field>

          <Field label="Promo price (optional)" name="promoPrice" errors={errors.promoPrice}>
            <input name="promoPrice" type="number" inputMode="decimal" min="0" step="0.01" defaultValue={product?.promoPrice} className={inputClass} {...invalid("promoPrice")} />
          </Field>

          <Field label="Category" name="category" errors={errors.category}>
            <input name="category" defaultValue={product?.category} placeholder="e.g. Drinks" className={inputClass} {...invalid("category")} />
          </Field>

          <Field label="Availability" name="availability" errors={errors.availability}>
            <select name="availability" defaultValue={product?.availability ?? "ACTIVE"} className={inputClass}>
              <option value="ACTIVE">Available</option>
              <option value="UNAVAILABLE">Unavailable</option>
            </select>
          </Field>

          <Field label="Description" name="description" errors={errors.description} className="sm:col-span-2">
            <textarea name="description" rows={3} defaultValue={product?.description} placeholder="What makes it special?" className={`${inputClass} resize-y`} {...invalid("description")} />
          </Field>

          <Field label="Photo" name="image" errors={errors.image} className="sm:col-span-2">
            <input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="text-[13px] text-brand-muted" {...invalid("image")} />
            {product?.imageUrl && (
              <span className="text-[12px] text-brand-muted">Leave empty to keep the current photo.</span>
            )}
          </Field>

          <Field label="Product link (optional)" name="productUrl" errors={errors.productUrl} className="sm:col-span-2">
            <input name="productUrl" type="url" defaultValue={product?.productUrl} placeholder="https://" className={inputClass} {...invalid("productUrl")} />
          </Field>

          <Field label="Notes for Keh (optional)" name="aiNotes" errors={errors.aiNotes} className="sm:col-span-2">
            <textarea name="aiNotes" rows={2} defaultValue={product?.aiNotes} placeholder="e.g. Our student favorite. Show the price." className={`${inputClass} resize-y`} {...invalid("aiNotes")} />
          </Field>
        </div>

        <div aria-live="polite">
          {state?.error && (
            <p className="text-[13px] text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {state.error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-brand-line">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-brand-line text-[14px] font-medium hover:bg-brand-bg"
          >
            Cancel
          </button>
          <Button type="submit" disabled={pending} className="h-9 px-4 text-[14px] font-semibold">
            {pending ? "Saving…" : product ? "Save changes" : "Add product"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
