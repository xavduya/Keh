"use client";

import { startTransition, useActionState, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanPicker } from "@/components/billing/PlanPicker";
import { DEFAULT_CTA_LABELS, LANGUAGE_LABELS, TONE_LABELS } from "@/constants";
import { saveProduct } from "@/app/(dashboard)/products/actions";
import { PhotoPicker } from "@/app/(dashboard)/products/PhotoPicker";
import type { Business, DefaultCTA, Language, SubscriptionPlan, Tone } from "@/types";
import { BRAND_IMAGE, prepareImage, setInputFile } from "@/utils/image";
import { finishOnboarding, saveOnboardingBrand, saveOnboardingBusiness, type OnboardingState } from "./actions";

type Step = "business" | "brand" | "product" | "plan" | "done";
type FieldErrors = Record<string, string[] | undefined>;

const INDUSTRIES = [
  "Café & coffee",
  "Restaurant & food",
  "Bakery & desserts",
  "Shop & retail",
  "Beauty & wellness",
  "Services",
  "Other",
];

const TONE_HINTS: Record<Tone, string> = {
  FRIENDLY: "Warm, like talking to a regular",
  PROFESSIONAL: "Clear and polished",
  CASUAL: "Relaxed and chatty",
  ENERGETIC: "Upbeat, lots of excitement",
  PREMIUM: "Elegant and refined",
  FUNNY: "Playful, a little witty",
  INFORMATIVE: "Helpful facts first",
};

const inputClass =
  "px-3 py-2 border border-brand-line rounded-lg text-[14px] bg-white focus-visible:outline-2 focus-visible:outline-brand aria-invalid:border-destructive";

function Field({
  label,
  hint,
  name,
  errors,
  children,
}: {
  label: string;
  hint?: string;
  name: string;
  errors: FieldErrors;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-brand-dark">{label}</span>
      {children}
      {hint && !errors[name] && <span className="text-[12px] text-brand-muted">{hint}</span>}
      {errors[name] && (
        <span id={`${name}-error`} className="text-[12px] text-destructive">
          {errors[name]![0]}
        </span>
      )}
    </label>
  );
}

function invalid(errors: FieldErrors, name: string) {
  return errors[name] ? { "aria-invalid": true as const, "aria-describedby": `${name}-error` } : {};
}

/** useActionState + transition submit (keeps input on validation errors); moves on when saved. */
function useStep(
  action: (state: OnboardingState, formData: FormData) => Promise<OnboardingState>,
  onSaved: () => void
) {
  const [state, formAction, pending] = useActionState(async (s: OnboardingState, formData: FormData) => {
    const result = await action(s, formData);
    if (result?.success) onSaved();
    return result;
  }, undefined);
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  }
  return { errors: state?.fieldErrors ?? {}, error: state?.error, pending, onSubmit };
}

function StepFooter({ pending, onBack, submitLabel = "Continue" }: { pending: boolean; onBack?: () => void; submitLabel?: string }) {
  return (
    <div className="flex items-center justify-between pt-2">
      {onBack ? (
        <button type="button" onClick={onBack} className="text-[14px] font-medium text-brand-muted hover:text-brand-dark">
          ← Back
        </button>
      ) : (
        <span />
      )}
      <Button type="submit" disabled={pending} className="h-10 px-5 text-[14px] font-semibold">
        {pending ? "Saving…" : submitLabel}
      </Button>
    </div>
  );
}

function FormError({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="text-[13px] text-destructive bg-destructive/10 rounded-lg px-3 py-2">
      {message}
    </p>
  ) : null;
}

export function OnboardingFlow({
  firstName,
  business,
  brand,
  currentPlan,
  billingEnabled,
}: {
  firstName: string;
  business: Business;
  brand: { tone: Tone; preferredLanguage: Language; defaultCTA: DefaultCTA; brandColor: string };
  currentPlan: SubscriptionPlan;
  billingEnabled: boolean;
}) {
  const steps: Step[] = ["business", "brand", "product", ...(billingEnabled ? (["plan"] as const) : []), "done"];
  const [step, setStep] = useState<Step>("business");
  const index = steps.indexOf(step);
  const next = () => setStep(steps[index + 1]);
  const back = () => setStep(steps[Math.max(index - 1, 0)]);

  const [finishing, startFinish] = useTransition();
  const [finishError, setFinishError] = useState<string | null>(null);
  function finish(nextPage: "/dashboard" | "/campaigns/new") {
    setFinishError(null);
    startFinish(async () => {
      const result = await finishOnboarding(nextPage);
      if (result?.error) setFinishError(result.error);
    });
  }

  const businessStep = useStep(saveOnboardingBusiness, next);
  const brandStep = useStep(saveOnboardingBrand, next);
  const [productAdded, setProductAdded] = useState(false);
  const productStep = useStep(saveProduct, () => {
    setProductAdded(true);
    next();
  });

  // Logo is resized (keeping transparency) before upload.
  const [logoError, setLogoError] = useState<string | null>(null);
  async function handleLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setLogoError(null);
    try {
      setInputFile(input, await prepareImage(file, BRAND_IMAGE));
    } catch {
      input.value = "";
      setLogoError("We couldn't read that image. Try a PNG or JPG.");
    }
  }

  const stepCount = steps.length - 1; // "done" isn't a numbered step

  return (
    <div className="bg-white rounded-xl border border-brand-line p-6 sm:p-8 space-y-6">
      {step !== "done" && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-[13px] font-semibold text-brand">
            Step {index + 1} of {stepCount}
          </p>
          <button
            type="button"
            onClick={() => finish("/dashboard")}
            disabled={finishing}
            className="text-[13px] text-brand-muted hover:text-brand-dark hover:underline disabled:opacity-50"
          >
            Skip setup for now
          </button>
        </div>
      )}
      {step !== "done" && (
        <div className="flex gap-1.5" aria-hidden="true">
          {steps.slice(0, stepCount).map((s, i) => (
            <span key={s} className={`h-1.5 flex-1 rounded-full ${i <= index ? "bg-brand" : "bg-brand-line"}`} />
          ))}
        </div>
      )}

      {step === "business" && (
        <form onSubmit={businessStep.onSubmit} noValidate className="space-y-5">
          <div>
            <h1 className="font-heading font-bold text-[22px] text-brand-dark">Welcome, {firstName}! Tell us about your business</h1>
            <p className="text-[14px] text-brand-muted mt-1">Keh uses this in every caption, so you never have to repeat it.</p>
          </div>
          <Field label="Business name" name="name" errors={businessStep.errors}>
            <input name="name" defaultValue={business.name} className={inputClass} {...invalid(businessStep.errors, "name")} />
          </Field>
          <Field label="What kind of business is it?" name="industry" errors={businessStep.errors}>
            <select name="industry" defaultValue={business.industry || INDUSTRIES[0]} className={inputClass}>
              {[...new Set([...(business.industry ? [business.industry] : []), ...INDUSTRIES])].map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Where are you?" hint="Town or area, e.g. Katipunan, Quezon City" name="location" errors={businessStep.errors}>
            <input name="location" defaultValue={business.location} className={inputClass} {...invalid(businessStep.errors, "location")} />
          </Field>
          <Field label="What do you sell? (optional)" hint="One or two sentences" name="description" errors={businessStep.errors}>
            <textarea name="description" rows={2} defaultValue={business.description} className={`${inputClass} resize-y`} />
          </Field>
          <Field label="Who are your customers? (optional)" hint="e.g. college students, office workers, families" name="targetAudience" errors={businessStep.errors}>
            <input name="targetAudience" defaultValue={business.targetAudience} className={inputClass} />
          </Field>
          <FormError message={businessStep.error} />
          <StepFooter pending={businessStep.pending} />
        </form>
      )}

      {step === "brand" && (
        <form onSubmit={brandStep.onSubmit} noValidate className="space-y-5">
          <div>
            <h1 className="font-heading font-bold text-[22px] text-brand-dark">How should your posts sound?</h1>
            <p className="text-[14px] text-brand-muted mt-1">Pick what feels like you. You can change it anytime.</p>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-[13px] font-semibold text-brand-dark mb-2">Tone</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.keys(TONE_LABELS) as Tone[]).map((tone) => (
                <label
                  key={tone}
                  className="flex cursor-pointer items-start gap-2 rounded-lg border border-brand-line p-3 has-[:checked]:border-brand has-[:checked]:bg-brand-light"
                >
                  <input type="radio" name="tone" value={tone} defaultChecked={tone === brand.tone} className="mt-1 accent-[#5849da]" />
                  <span>
                    <span className="block text-[14px] font-semibold text-brand-dark">{TONE_LABELS[tone]}</span>
                    <span className="block text-[12px] text-brand-muted">{TONE_HINTS[tone]}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Language" name="preferredLanguage" errors={brandStep.errors}>
              <select name="preferredLanguage" defaultValue={brand.preferredLanguage} className={inputClass}>
                {(Object.keys(LANGUAGE_LABELS) as Language[]).map((l) => (
                  <option key={l} value={l}>
                    {LANGUAGE_LABELS[l]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="What should customers do?" name="defaultCTA" errors={brandStep.errors}>
              <select name="defaultCTA" defaultValue={brand.defaultCTA} className={inputClass}>
                {(Object.keys(DEFAULT_CTA_LABELS) as DefaultCTA[]).map((c) => (
                  <option key={c} value={c}>
                    {DEFAULT_CTA_LABELS[c]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Brand color" name="brandColor" errors={brandStep.errors}>
              <input type="color" name="brandColor" defaultValue={brand.brandColor} className="h-10 w-20 cursor-pointer rounded-lg border border-brand-line bg-white p-1" />
            </Field>
            <Field
              label="Logo (optional)"
              name="logo"
              errors={logoError ? { ...brandStep.errors, logo: [logoError] } : brandStep.errors}
            >
              <input type="file" name="logo" accept="image/*" onChange={handleLogo} className="text-[13px] text-brand-muted" />
            </Field>
          </div>

          <FormError message={brandStep.error} />
          <StepFooter pending={brandStep.pending} onBack={back} />
        </form>
      )}

      {step === "product" && (
        <form onSubmit={productStep.onSubmit} noValidate className="space-y-5">
          <div>
            <h1 className="font-heading font-bold text-[22px] text-brand-dark">Add something you sell</h1>
            <p className="text-[14px] text-brand-muted mt-1">
              Every campaign spotlights a product or service. Start with your best seller — you can add more later.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Name" name="name" errors={productStep.errors}>
              <input name="name" placeholder="e.g. Iced Spanish Latte" className={inputClass} {...invalid(productStep.errors, "name")} />
            </Field>
            <Field label="Price (₱)" name="price" errors={productStep.errors}>
              <input name="price" type="number" min="0" step="0.01" inputMode="decimal" className={inputClass} {...invalid(productStep.errors, "price")} />
            </Field>
          </div>
          <Field label="Description (optional)" hint="What makes it good? Keh uses this in captions." name="description" errors={productStep.errors}>
            <textarea name="description" rows={2} className={`${inputClass} resize-y`} />
          </Field>
          <PhotoPicker name="image" error={productStep.errors.image?.[0]} />
          <FormError message={productStep.error} />
          <div className="flex items-center justify-between pt-2">
            <button type="button" onClick={back} className="text-[14px] font-medium text-brand-muted hover:text-brand-dark">
              ← Back
            </button>
            <div className="flex items-center gap-4">
              <button type="button" onClick={next} className="text-[14px] font-medium text-brand-muted hover:text-brand-dark hover:underline">
                Skip
              </button>
              <Button type="submit" disabled={productStep.pending} className="h-10 px-5 text-[14px] font-semibold">
                {productStep.pending ? "Saving…" : "Add product"}
              </Button>
            </div>
          </div>
        </form>
      )}

      {step === "plan" && (
        <div className="space-y-5">
          <div>
            <h1 className="font-heading font-bold text-[22px] text-brand-dark">Pick a plan</h1>
            <p className="text-[14px] text-brand-muted mt-1">Start free and upgrade whenever you need more. You can change this anytime.</p>
          </div>
          <PlanPicker currentPlan={currentPlan} billingEnabled={billingEnabled} onChanged={next} />
          <div className="flex items-center justify-between pt-2">
            <button type="button" onClick={back} className="text-[14px] font-medium text-brand-muted hover:text-brand-dark">
              ← Back
            </button>
            <Button type="button" onClick={next} className="h-10 px-5 text-[14px] font-semibold">
              Continue with {currentPlan === "FREE" ? "Free" : "my plan"}
            </Button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="space-y-5 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-brand">
            <Check size={24} />
          </span>
          <div>
            <h1 className="font-heading font-bold text-[22px] text-brand-dark">You&apos;re all set!</h1>
            <p className="text-[14px] text-brand-muted mt-1">
              {productAdded
                ? "Keh knows your business now. Let's plan your first campaign — it takes about a minute."
                : "Keh knows your business now. Add a product whenever you're ready, then create your first campaign."}
            </p>
          </div>
          {finishError && <FormError message={finishError} />}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              type="button"
              onClick={() => finish(productAdded ? "/campaigns/new" : "/dashboard")}
              disabled={finishing}
              className="h-10 px-5 text-[14px] font-semibold"
            >
              {finishing ? "Opening…" : productAdded ? "Create my first campaign" : "Go to Home"}
            </Button>
            {productAdded && (
              <button
                type="button"
                onClick={() => finish("/dashboard")}
                disabled={finishing}
                className="text-[14px] font-medium text-brand-muted hover:text-brand-dark hover:underline"
              >
                Go to Home
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
