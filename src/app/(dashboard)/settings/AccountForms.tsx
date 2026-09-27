"use client";

import { AuthForm } from "@/components/auth/AuthForm";
import { updatePassword } from "@/app/(auth)/actions";
import { changeEmail, deleteAccount } from "./actions";

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-[12px] border border-brand-line p-6">
      <h2 className="font-heading font-[700] text-[17px] text-brand-dark">{title}</h2>
      <p className="text-[13px] text-brand-muted mt-1 mb-4">{description}</p>
      <div className="max-w-[400px]">{children}</div>
    </section>
  );
}

export function AccountForms() {
  return (
    <>
      <Section title="Change password" description="Use at least 8 characters.">
        <AuthForm
          action={updatePassword}
          submitLabel="Change password"
          pendingLabel="Saving…"
          fields={[
            { name: "password", label: "New password", type: "password", autoComplete: "new-password" },
            { name: "confirmPassword", label: "Confirm new password", type: "password", autoComplete: "new-password" },
          ]}
        />
      </Section>

      <Section title="Change email" description="We'll send a confirmation link before anything changes.">
        <AuthForm
          action={changeEmail}
          submitLabel="Change email"
          pendingLabel="Sending…"
          fields={[{ name: "email", label: "New email", type: "email", autoComplete: "email" }]}
        />
      </Section>

      <Section
        title="Delete account"
        description="Permanently deletes your account, business, products, campaigns, photos and connected accounts. This can't be undone."
      >
        <AuthForm
          action={deleteAccount}
          submitLabel="Delete my account"
          pendingLabel="Deleting…"
          submitVariant="destructive"
          fields={[{ name: "confirm", label: "Type DELETE to confirm", autoComplete: "off" }]}
        />
      </Section>
    </>
  );
}
