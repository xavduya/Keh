import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentContext } from "@/lib/auth/context";
import { signOut } from "@/app/(auth)/actions";
import { AccountForms } from "./AccountForms";

function SettingsRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-brand-line last:border-0">
      <div>
        <p className="text-[14px] font-[600] text-brand-dark">{label}</p>
        <p className="text-[13px] text-brand-muted mt-0.5">{description}</p>
      </div>
      {children}
    </div>
  );
}

const chip =
  "inline-flex items-center px-2.5 py-1 rounded-md bg-brand-light text-brand text-[12px] font-[700] whitespace-nowrap";

export default async function SettingsPage() {
  const { user } = await getCurrentContext();

  return (
    <div className="space-y-5">
      <PageHeader title="Make yourself at home" subtitle="Your account and workspace." />

      <section className="bg-white rounded-[12px] border border-brand-line p-6">
        <h2 className="font-heading font-[700] text-[17px] text-brand-dark mb-2">Account</h2>

        <SettingsRow label="Signed in as" description={user.email}>
          <form action={signOut}>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-[7px] border border-brand-line text-[13px] font-[500] hover:bg-brand-bg"
            >
              Log out
            </button>
          </form>
        </SettingsRow>

        <SettingsRow
          label="Business and brand"
          description="Your business details, brand voice and call to action — used in every caption."
        >
          <Link href="/brand" className="text-[13px] font-[600] text-brand hover:underline whitespace-nowrap">
            Edit
          </Link>
        </SettingsRow>

        <SettingsRow label="Timezone" description="All scheduled posts use Philippine time.">
          <span className={chip}>Asia/Manila · UTC+8</span>
        </SettingsRow>
      </section>

      <AccountForms />
    </div>
  );
}
