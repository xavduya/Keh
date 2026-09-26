import { redirect } from "next/navigation";

/**
 * Root route — redirect to the dashboard.
 * In Phase 3 this will be a marketing landing page for unauthenticated users.
 */
export default function RootPage() {
  redirect("/dashboard");
}
