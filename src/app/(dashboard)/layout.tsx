import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getCurrentContext } from "@/lib/auth/context";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { user, business } = await getCurrentContext();

  return (
    <DashboardLayout
      businessName={business.name}
      businessLocation={business.location}
      userName={user.fullName}
      userEmail={user.email}
    >
      {children}
    </DashboardLayout>
  );
}
