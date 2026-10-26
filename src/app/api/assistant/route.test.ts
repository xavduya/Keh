import { beforeEach, expect, it, vi } from "vitest";
import { AiGenerationError } from "@/lib/ai/errors";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), business: vi.fn(), generate: vi.fn(), quota: vi.fn(), context: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: async () => ({ auth: { getUser: mocks.auth } }) }));
vi.mock("@/services/business.service", () => ({ getBusinessByOwnerId: mocks.business, getSubscription: async () => ({ plan: "FREE" }) }));
vi.mock("@/lib/ai/ai.service", () => ({ generateMarketingAdvice: mocks.generate, usesModel: () => true }));
vi.mock("@/lib/ai/providers", () => ({ activeProvider: () => "gemini" }));
vi.mock("@/lib/ai/context", () => ({ buildMarketingContext: mocks.context }));
vi.mock("@/lib/ai/rate-limit", () => ({ consumeAiRequest: mocks.quota }));
import { POST } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ data: { user: { id: "owner" } } });
  mocks.business.mockResolvedValue({ id: "business" });
  mocks.context.mockResolvedValue({ context: {} });
  mocks.quota.mockResolvedValue({ allowed: true });
  mocks.generate.mockResolvedValue({ answer: "Try a weekend offer.", mode: "ai" });
});
const request = () => new Request("http://localhost/api/assistant", { method: "POST", body: JSON.stringify({ question: "Suggest a campaign" }) });

it("returns the generated answer to the website", async () => {
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ answer: "Try a weekend offer.", mode: "ai" });
});
it("preserves actionable provider failures instead of hiding them", async () => {
  mocks.generate.mockRejectedValue(new AiGenerationError("Gemini is busy. Please retry.", 503));
  const response = await POST(request());
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: "Gemini is busy. Please retry." });
});
it("does not generate when the rate limiter is unavailable", async () => {
  mocks.quota.mockResolvedValue({ allowed: false, unavailable: true });
  expect((await POST(request())).status).toBe(503);
  expect(mocks.generate).not.toHaveBeenCalled();
});
it("returns JSON for a signed-out browser", async () => {
  mocks.auth.mockResolvedValue({ data: { user: null } });
  expect((await POST(request())).status).toBe(401);
  expect(mocks.generate).not.toHaveBeenCalled();
});
it("distinguishes missing business profiles from missing routes", async () => {
  mocks.business.mockResolvedValue(null);
  const response = await POST(request());
  expect(response.status).toBe(404);
  expect((await response.json()).error).toContain("business profile");
});
