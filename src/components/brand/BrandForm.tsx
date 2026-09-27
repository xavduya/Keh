"use client";

import Image from "next/image";
import { startTransition, useActionState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { TONE_LABELS, LANGUAGE_LABELS, DEFAULT_CTA_LABELS } from "@/constants";
import { saveBrandProfile } from "@/app/(dashboard)/brand/actions";
import type { Business, BrandProfile } from "@/types";

const inputClass =
  "px-3 py-2 border border-brand-line rounded-lg text-[14px] bg-white focus-visible:outline-2 focus-visible:outline-brand aria-invalid:border-destructive";

type FieldErrors = Record<string, string[] | undefined>;

function Field({
  label,
  name,
  errors,
  className = "",
  children,
}: {
  label: string;
  name: string;
  errors: FieldErrors;
  className?: string;
  children: React.ReactNode;
}) {
  const message = errors[name]?.[0];
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[13px] font-semibold text-brand-dark">{label}</span>
      {children}
      {message && (
        <span id={`${name}-error`} className="text-[12px] text-destructive">
          {message}
        </span>
      )}
    </label>
  );
}

/** aria props for an input with a possible error. */
function invalid(errors: FieldErrors, name: string) {
  return errors[name]
    ? { "aria-invalid": true as const, "aria-describedby": `${name}-error` }
    : {};
}

function TextInput({
  label, name, value, errors, type = "text", placeholder,
}: {
  label: string;
  name: string;
  value?: string;
  errors: FieldErrors;
  type?: string;
  placeholder?: string;
}) {
  return (
    <Field label={label} name={name} errors={errors}>
      <input
        name={name}
        type={type}
        defaultValue={value}
        placeholder={placeholder}
        className={inputClass}
        {...invalid(errors, name)}
      />
    </Field>
  );
}

function SelectInput({
  label, name, options, value, errors,
}: {
  label: string;
  name: string;
  options: Record<string, string>;
  value: string;
  errors: FieldErrors;
}) {
  return (
    <Field label={label} name={name} errors={errors}>
      <select name={name} defaultValue={value} className={inputClass} {...invalid(errors, name)}>
        {Object.entries(options).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
    </Field>
  );
}

function ImageInput({
  label, name, currentUrl, errors,
}: {
  label: string;
  name: string;
  currentUrl?: string;
  errors: FieldErrors;
}) {
  return (
    <Field label={label} name={name} errors={errors}>
      {currentUrl && (
        <span className="relative w-16 h-16 rounded-lg overflow-hidden border border-brand-line bg-brand-bg">
          <Image src={currentUrl} alt="" fill className="object-cover" sizes="64px" unoptimized />
        </span>
      )}
      <input
        name={name}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="text-[13px] text-brand-muted"
        {...invalid(errors, name)}
      />
      {currentUrl && (
        <span className="text-[12px] text-brand-muted">Leave empty to keep the current image.</span>
      )}
    </Field>
  );
}

export function BrandForm({
  business,
  brandProfile,
}: {
  business: Business;
  brandProfile: BrandProfile;
}) {
  const [state, formAction, pending] = useActionState(saveBrandProfile, undefined);
  const errors: FieldErrors = state?.fieldErrors ?? {};

  // Submit via a transition instead of <form action>: React resets
  // action-driven forms after every submit, which would wipe the user's
  // input whenever validation fails.
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <PageHeader
        title="Your business, in your own words"
        subtitle="The more we understand your business, the better your content becomes."
      />

      {/* Business information */}
      <section className="bg-white rounded-xl border border-brand-line p-6">
        <h2 className="font-heading font-bold text-[17px] text-brand-dark mb-1">Business information</h2>
        <p className="text-[13px] text-brand-muted mb-5">Keh uses these details when writing for you.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput label="Business name" name="name" value={business.name} errors={errors} />
          <TextInput label="Industry" name="industry" value={business.industry} errors={errors} placeholder="e.g. Café & restaurant" />
          <Field label="Description" name="description" errors={errors} className="sm:col-span-2">
            <textarea
              name="description"
              defaultValue={business.description}
              rows={3}
              className={`${inputClass} resize-y`}
              {...invalid(errors, "description")}
            />
          </Field>
          <TextInput label="Location" name="location" value={business.location} errors={errors} placeholder="e.g. Cebu City" />
          <TextInput label="Operating hours" name="operatingHours" value={business.operatingHours} errors={errors} placeholder="e.g. 8:00 AM – 9:00 PM" />
          <TextInput label="Phone" name="phone" value={business.phone} errors={errors} type="tel" />
          <TextInput label="Website" name="website" value={business.website} errors={errors} type="url" placeholder="https://" />
          <TextInput label="Delivery options" name="delivery" value={business.delivery} errors={errors} placeholder="e.g. Pickup, GrabFood" />
          <TextInput label="Payment methods" name="payment" value={business.payment} errors={errors} placeholder="e.g. Cash, GCash" />
        </div>
      </section>

      {/* Audience */}
      <section className="bg-white rounded-xl border border-brand-line p-6">
        <h2 className="font-heading font-bold text-[17px] text-brand-dark mb-5">Your audience</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput label="Target customers" name="targetAudience" value={business.targetAudience} errors={errors} placeholder="e.g. College students" />
          <TextInput label="Age group" name="audienceAgeGroup" value={business.audienceAgeGroup} errors={errors} placeholder="e.g. 18–35" />
          <div className="sm:col-span-2">
            <TextInput label="Interests" name="audienceInterests" value={business.audienceInterests} errors={errors} placeholder="e.g. Coffee, studying, local food" />
          </div>
        </div>
      </section>

      {/* Brand voice */}
      <section className="bg-white rounded-xl border border-brand-line p-6">
        <h2 className="font-heading font-bold text-[17px] text-brand-dark mb-5">Brand voice &amp; identity</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectInput label="Tone" name="tone" options={TONE_LABELS} value={brandProfile.tone} errors={errors} />
          <SelectInput label="Preferred language" name="preferredLanguage" options={LANGUAGE_LABELS} value={brandProfile.preferredLanguage} errors={errors} />
          <SelectInput label="Default call to action" name="defaultCTA" options={DEFAULT_CTA_LABELS} value={brandProfile.defaultCTA} errors={errors} />
          <Field label="Brand color" name="brandColor" errors={errors}>
            <input
              name="brandColor"
              type="color"
              defaultValue={brandProfile.brandColors[0] ?? "#5849da"}
              className="h-10 w-20 rounded-lg border border-brand-line bg-white p-1"
              {...invalid(errors, "brandColor")}
            />
          </Field>
          <ImageInput label="Brand logo" name="logo" currentUrl={brandProfile.logoUrl} errors={errors} />
          <ImageInput label="Brand image" name="brandImage" currentUrl={brandProfile.brandImageUrl} errors={errors} />
          <Field label="Brand guidelines" name="brandGuidelines" errors={errors} className="sm:col-span-2">
            <textarea
              name="brandGuidelines"
              defaultValue={brandProfile.brandGuidelines}
              rows={3}
              placeholder="e.g. Always mention we're student-friendly. Avoid slang."
              className={`${inputClass} resize-y`}
              {...invalid(errors, "brandGuidelines")}
            />
          </Field>
        </div>
      </section>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div aria-live="polite" className="text-[13px]">
          {state?.error && <span className="text-destructive">{state.error}</span>}
          {state?.fieldErrors && <span className="text-destructive">Please fix the highlighted fields.</span>}
          {state?.success && !pending && <span className="text-brand">✓ Saved. Your next campaign will use these details.</span>}
        </div>
        <Button type="submit" disabled={pending} className="h-10 px-5 text-[14px] font-semibold">
          {pending ? "Saving…" : "Save business profile"}
        </Button>
      </div>
    </form>
  );
}
