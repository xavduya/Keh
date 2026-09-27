import { redirect } from "next/navigation";

/**
 * Root route — redirect to the dashboard.
 * The proxy sends signed-out visitors on to /login.
 */
export default function RootPage() {
  redirect("/dashboard");
}
