import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getCurrentContext } from "@/lib/auth/context";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { user, business } = await getCurrentContext();
  // New owners set up their business first (finish or skip).
  if (!business.onboarded) redirect("/onboarding");

  return (
    <DashboardLayout
      businessId={business.id}
      businessName={business.name}
      businessLocation={business.location}
      userName={user.fullName}
      userEmail={user.email}
    >
      {children}
    </DashboardLayout>
  );
}
