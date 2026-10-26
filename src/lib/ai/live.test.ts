import { expect, it } from "vitest";
import { generateMarketingAdvice, type MarketingAssistantContext } from "./ai.service";
import { MarketingAssistantResponseSchema } from "@/lib/validation/schemas";

// Opt in explicitly: uses the local Gemini key and synthetic business data only.
it.skipIf(process.env.KEH_LIVE_AI_TEST !== "true")("generates consecutive live Gemini answers", async () => {
  const context: MarketingAssistantContext = {
    business: { name: "Test Cafe", description: "A local coffee shop", industry: "Cafe", location: "Manila", targetAudience: "Local customers", preferredLanguage: "ENGLISH", operatingHours: "9am-6pm", delivery: "Pickup", payment: "Cash" },
    brandProfile: null,
    products: [{ id: "11111111-1111-4111-8111-111111111111", name: "Iced Coffee", description: "Fresh iced coffee", price: 100, category: "Drinks", availability: "ACTIVE" }],
    performance: null,
    slot: { label: "Friday evening", time: "18:00", fromResults: false, weekday: 5 },
  };
  for (const question of ["Give me two campaign ideas for iced coffee.", "Write a short friendly caption for iced coffee."]) {
    const response = await generateMarketingAdvice({ question, history: [], actionIntent: "chat" }, context);
    expect(response.mode).toBe("ai");
    expect(MarketingAssistantResponseSchema.safeParse(response).success).toBe(true);
    expect(response.answer.trim().length).toBeGreaterThan(10);
    console.info("Live Gemini answer validated:", response.answer.slice(0, 160));
  }
}, 90_000);

it.skipIf(process.env.KEH_LIVE_AI_TEST !== "true")("proposes product updates and saved campaigns without executing them", async () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const context: MarketingAssistantContext = {
    business: { name: "Test Cafe", description: "Coffee shop", industry: "Cafe", location: "Manila", targetAudience: "Locals", preferredLanguage: "ENGLISH", operatingHours: "9am-6pm", delivery: "Pickup", payment: "Cash" },
    brandProfile: null, performance: null, slot: { weekday: 5, time: "18:00", label: "Friday evening", fromResults: false },
    products: [{ id, name: "Iced Coffee", description: "Fresh iced coffee", price: 100, category: "Drinks", availability: "ACTIVE" }],
  };
  const update = await generateMarketingAdvice({ question: "Change the price of Iced Coffee to 120 pesos. Leave every other field unchanged. Prepare it for my review.", history: [], actionIntent: "chat" }, context);
  console.info("Live update proposal:", JSON.stringify(update));
  expect(update.control).toEqual({ kind: "UPDATE_PRODUCT", id, fields: { price: 120 } });
  const campaign = await generateMarketingAdvice({ question: "Create and save a new draft campaign for Iced Coffee. Goal: PROMOTE_PRODUCT. Platform: FACEBOOK. Caption: Fresh iced coffee for your afternoon break. No discount or schedule. Prepare it for review.", history: [], actionIntent: "chat" }, context);
  expect(campaign.control).toMatchObject({ kind: "SAVE_CAMPAIGN", intent: "draft", fields: { productId: id, goal: "PROMOTE_PRODUCT", platforms: ["FACEBOOK"] } });
  expect(MarketingAssistantResponseSchema.safeParse(campaign).success).toBe(true);
}, 90_000);
