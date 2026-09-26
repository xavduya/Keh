/**
 * Supabase server client
 *
 * Used in Server Components, Server Actions, and API route handlers.
 * May use the service-role key for privileged operations — NEVER expose to
 * the browser.
 *
 * NOTE: This is a stub. Implement in Phase 5 when Supabase is configured.
 *
 * Usage:
 *   import { supabaseServerClient } from "@/lib/supabase/server";
 */

// Uncomment and install @supabase/ssr in Phase 5:
//
// import { createServerClient } from "@supabase/ssr";
// import { cookies } from "next/headers";
//
// export function supabaseServerClient() {
//   const cookieStore = cookies();
//   return createServerClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     {
//       cookies: {
//         get(name) { return cookieStore.get(name)?.value; },
//         set(name, value, options) { cookieStore.set({ name, value, ...options }); },
//         remove(name, options) { cookieStore.set({ name, value: "", ...options }); },
//       },
//     }
//   );
// }
//
// /** Admin client using service-role key — server-side only */
// export function supabaseAdminClient() {
//   return createServerClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.SUPABASE_SERVICE_ROLE_KEY!,
//     { cookies: { get: () => undefined, set: () => {}, remove: () => {} } }
//   );
// }

export {}; // Placeholder — remove when implementing
