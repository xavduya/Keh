import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const auth = vi.hoisted(() => ({ getClaims: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth }) }));
vi.mock("@/lib/env", () => ({ publicEnv: { supabaseUrl: "https://example.supabase.co", supabasePublishableKey: "test" } }));
import { proxy } from "./proxy";

beforeEach(() => auth.getClaims.mockReset());
it("allows verified claims through to the page's authoritative check", async () => {
  auth.getClaims.mockResolvedValue({ data: { claims: { sub: "owner" } }, error: null });
  const response = await proxy(new NextRequest("http://localhost/dashboard"));
  expect(response.headers.get("location")).toBeNull();
});
it.each([
  { data: null, error: null },
  { data: { claims: { sub: "owner" } }, error: new Error("Invalid signature") },
])("redirects absent or invalid claims to login", async (result) => {
  auth.getClaims.mockResolvedValue(result);
  const response = await proxy(new NextRequest("http://localhost/products"));
  expect(response.headers.get("location")).toBe("http://localhost/login");
});
it("lets assistant requests reach their own authentication handler", async () => {
  auth.getClaims.mockResolvedValue({ data: null, error: null });
  const response = await proxy(new NextRequest("http://localhost/api/assistant"));
  expect(response.headers.get("location")).toBeNull();
});
