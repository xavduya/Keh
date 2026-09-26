"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { mockBusiness, mockBrandProfile } from "@/data/mock-business";
import { TONE_LABELS, LANGUAGE_LABELS, DEFAULT_CTA_LABELS } from "@/constants";

function FormField({
  label, name, value, type = "text", children,
}: {
  label: string;
  name: string;
  value?: string;
  type?: string;
  children?: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-[600] text-[#262535]">{label}</span>
      {children ?? (
        <input
          name={name}
          type={type}
          defaultValue={value}
          className="px-3 py-2 border border-[#e9e9ef] rounded-[8px] text-[14px] bg-white focus:outline-none focus:border-[#5849da] transition-colors"
        />
      )}
    </label>
  );
}

function SelectField({
  label, name, options, value,
}: {
  label: string;
  name: string;
  options: Record<string, string>;
  value: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-[600] text-[#262535]">{label}</span>
      <select
        name={name}
        defaultValue={value}
        className="px-3 py-2 border border-[#e9e9ef] rounded-[8px] text-[14px] bg-white focus:outline-none focus:border-[#5849da] transition-colors"
      >
        {Object.entries(options).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
    </label>
  );
}

export default function BrandPage() {
  const b = mockBusiness;
  const brand = mockBrandProfile;
  const [saved, setSaved] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <PageHeader
        title="Your business, in your own words"
        subtitle="The more we understand your business, the better your content becomes."
      />

      {/* Business information */}
      <section className="bg-white rounded-[12px] border border-[#e9e9ef] p-6">
        <h2 className="font-heading font-[700] text-[17px] text-[#262535] mb-1">Business information</h2>
        <p className="text-[13px] text-[#7b7b8b] mb-5">Keh uses these details when writing for you.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Business name" name="name" value={b.name} />
          <FormField label="Industry" name="industry" value={b.industry} />
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-[13px] font-[600] text-[#262535]">Description</span>
            <textarea
              name="description"
              defaultValue={b.description}
              rows={3}
              className="px-3 py-2 border border-[#e9e9ef] rounded-[8px] text-[14px] bg-white focus:outline-none focus:border-[#5849da] transition-colors resize-y"
            />
          </label>
          <FormField label="Location" name="location" value={b.location} />
          <FormField label="Operating hours" name="hours" value={b.operatingHours} />
          <FormField label="Phone" name="phone" value={b.phone} />
          <FormField label="Website" name="website" value={b.website} type="url" />
          <FormField label="Delivery options" name="delivery" value={b.delivery} />
          <FormField label="Payment methods" name="payment" value={b.payment} />
        </div>
      </section>

      {/* Audience */}
      <section className="bg-white rounded-[12px] border border-[#e9e9ef] p-6">
        <h2 className="font-heading font-[700] text-[17px] text-[#262535] mb-5">Your audience</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Target customers" name="audience" value={b.targetAudience} />
          <FormField label="Age group" name="age" value={b.audienceAgeGroup} />
          <FormField label="Audience location" name="audienceLocation" value={b.location} />
          <FormField label="Interests" name="interests" value={b.audienceInterests} />
        </div>
      </section>

      {/* Brand voice */}
      <section className="bg-white rounded-[12px] border border-[#e9e9ef] p-6">
        <h2 className="font-heading font-[700] text-[17px] text-[#262535] mb-5">Brand voice &amp; identity</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField
            label="Tone"
            name="tone"
            options={TONE_LABELS}
            value={brand.tone}
          />
          <SelectField
            label="Preferred language"
            name="language"
            options={LANGUAGE_LABELS}
            value={brand.preferredLanguage}
          />
          <SelectField
            label="Default call to action"
            name="cta"
            options={DEFAULT_CTA_LABELS}
            value={brand.defaultCTA}
          />
          <FormField label="Brand color" name="color" value={brand.brandColors[0]} type="color" />
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-[600] text-[#262535]">Brand logo</span>
            <input type="file" accept="image/*" className="text-[13px] text-[#7b7b8b]" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-[600] text-[#262535]">Brand image</span>
            <input type="file" accept="image/*" className="text-[13px] text-[#7b7b8b]" />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-[13px] font-[600] text-[#262535]">Brand guidelines</span>
            <textarea
              name="guidelines"
              defaultValue={brand.brandGuidelines}
              rows={3}
              className="px-3 py-2 border border-[#e9e9ef] rounded-[8px] text-[14px] bg-white focus:outline-none focus:border-[#5849da] transition-colors resize-y"
            />
          </label>
        </div>
      </section>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-[#7b7b8b]">Changes stay in this demo session.</p>
        <button
          type="submit"
          className="px-5 py-2.5 rounded-[8px] bg-[#5849da] text-white text-[14px] font-[600] hover:bg-[#4a3cc7] transition-colors"
        >
          {saved ? "✓ Saved" : "Save business profile"}
        </button>
      </div>
    </form>
  );
}
