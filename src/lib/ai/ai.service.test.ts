import { beforeEach, expect, it, vi } from "vitest";
import { generateMarketingAdvice, type MarketingAssistantContext } from "./ai.service";
import { AiGenerationError } from "./errors";
import { MarketingAssistantResponseSchema } from "@/lib/validation/schemas";
import { dashboardControlJsonSchema } from "./control-schema";

const generate = vi.hoisted(() => vi.fn());
vi.mock("./providers", () => ({ generateJson: generate }));
const context: MarketingAssistantContext = {
  business: { name: "Cafe", description: "Coffee shop", industry: "Cafe", location: "Manila", targetAudience: "Locals", preferredLanguage: "ENGLISH", operatingHours: "9am-6pm", delivery: "Pickup", payment: "Cash" },
  products: [], brandProfile: null, performance: null,
  slot: { weekday: 5, time: "18:00", label: "Friday evening", fromResults: false },
};
beforeEach(() => { generate.mockReset(); });
const request = { question: "Suggest a campaign", history: [], actionIntent: "ideas" as const };

it("preserves a valid answer even when optional action data is unusable", async () => {
  generate.mockResolvedValue(JSON.stringify({ answer: "Try a weekend coffee offer.", action: { type: "invalid" } }));
  const result = await generateMarketingAdvice(request, context);
  expect(result.mode).toBe("ai");
  expect(result.answer).toContain("weekend");
  expect(result.action).toBeUndefined();
  expect(MarketingAssistantResponseSchema.safeParse(result).success).toBe(true);
});
it.each([null, "{}", '{"answer":"  "}', "not JSON"])("rejects unusable responses rather than returning canned ideas", async (text) => {
  generate.mockResolvedValue(text);
  await expect(generateMarketingAdvice(request, context)).rejects.toBeInstanceOf(AiGenerationError);
});
it("propagates Gemini outages", async () => {
  generate.mockRejectedValue(new AiGenerationError("Gemini is busy"));
  await expect(generateMarketingAdvice(request, context)).rejects.toThrow("Gemini is busy");
});
it("keeps calculated scheduling available without a model call", async () => {
  const result = await generateMarketingAdvice({ ...request, actionIntent: "schedule", question: "When should I post?" }, context);
  expect(result.mode).toBe("guided");
  expect(generate).not.toHaveBeenCalled();
});

it("preserves an explicit removal of a product promo price", async () => {
  const control = { kind: "UPDATE_PRODUCT", id: "11111111-1111-4111-8111-111111111111", fields: { promoPrice: null } };
  generate.mockResolvedValue(JSON.stringify({ answer: "Review removing the promo price.", control }));
  const result = await generateMarketingAdvice({ ...request, actionIntent: "chat" }, context);
  expect(result.control).toEqual(control);
});

it("uses Gemini-compatible tagged commands and excludes wizard actions from general chat", async () => {
  const schema = dashboardControlJsonSchema();
  expect(schema.anyOf).toHaveLength(7);
  expect(JSON.stringify(schema)).not.toMatch(/"oneOf"|"const"|"\$schema"/);
  generate.mockResolvedValue(JSON.stringify({ answer: "Which product should I update?" }));
  await generateMarketingAdvice({ ...request, actionIntent: "chat" }, context);
  const options = generate.mock.calls[0][2];
  expect(options.schema.schema.properties.control).toEqual(schema);
  expect(options.schema.schema.properties.action).toBeUndefined();
  expect(generate.mock.calls[0][1].at(-1).content).toContain("Current draft: null");
});
