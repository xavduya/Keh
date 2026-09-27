"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { AuthFormState } from "@/app/(auth)/actions";

export interface AuthField {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
}

interface AuthFormProps {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  fields: AuthField[];
  submitLabel: string;
  pendingLabel: string;
}

export function AuthForm({ action, fields, submitLabel, pendingLabel }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {fields.map((field) => {
        const errors = state?.fieldErrors?.[field.name];
        const errorId = `${field.name}-error`;
        return (
          <label key={field.name} className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-brand-dark">{field.label}</span>
            <input
              name={field.name}
              type={field.type ?? "text"}
              autoComplete={field.autoComplete}
              placeholder={field.placeholder}
              aria-invalid={errors ? true : undefined}
              aria-describedby={errors ? errorId : undefined}
              className="px-3 py-2 border border-brand-line rounded-lg text-[14px] bg-white focus-visible:outline-2 focus-visible:outline-brand aria-invalid:border-destructive"
            />
            {errors && (
              <span id={errorId} className="text-[12px] text-destructive">
                {errors[0]}
              </span>
            )}
          </label>
        );
      })}

      <div aria-live="polite">
        {state?.error && (
          <p className="text-[13px] text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            {state.error}
          </p>
        )}
        {state?.message && (
          <p className="text-[13px] text-brand bg-brand-light rounded-lg px-3 py-2">
            {state.message}
          </p>
        )}
      </div>

      <Button type="submit" disabled={pending} className="w-full h-10 text-[14px] font-semibold">
        {pending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}
