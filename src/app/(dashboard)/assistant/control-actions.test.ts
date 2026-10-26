import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ context: vi.fn(), product: vi.fn(), campaign: vi.fn(), brand: vi.fn(), saveProduct: vi.fn(), removeProduct: vi.fn(), persist: vi.fn(), removeCampaign: vi.fn(), saveBrand: vi.fn() }));
vi.mock("@/lib/auth/context", () => ({ getCurrentContext: mocks.context }));
vi.mock("@/services/product.service", () => ({ getProductById: mocks.product }));
vi.mock("@/services/campaign.service", () => ({ getCampaignWithPosts: mocks.campaign }));
vi.mock("@/services/business.service", () => ({ getBrandProfile: mocks.brand }));
vi.mock("@/app/(dashboard)/products/actions", () => ({ saveProduct: mocks.saveProduct, removeProduct: mocks.removeProduct }));
vi.mock("@/app/(dashboard)/campaigns/actions", () => ({ persistCampaign: mocks.persist, removeCampaign: mocks.removeCampaign }));
vi.mock("@/app/(dashboard)/brand/actions", () => ({ saveBrandProfile: mocks.saveBrand }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { reviewDashboardControl, applyDashboardControl } from "./control-actions";
const id = "11111111-1111-4111-8111-111111111111";
const campaignId = "22222222-2222-4222-8222-222222222222";
const product = { id, businessId: "owner-business", name: "Coffee", description: "Cold brew", price: 100, promoPrice: 90, category: "Drinks", productUrl: "", availability: "ACTIVE", aiNotes: "" };
const update = { kind: "UPDATE_PRODUCT", id, fields: { price: 120 } };
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("AI_ENABLED", "true"); vi.stubEnv("PUBLISHING_ENABLED", "false");
  mocks.context.mockResolvedValue({ business: { id: "owner-business" } });
  mocks.product.mockResolvedValue({ ...product });
  mocks.saveProduct.mockResolvedValue({ success: true });
  mocks.persist.mockResolvedValue({ campaignId });
});
it("reviews server values without writing", async () => {
  const result = await reviewDashboardControl(update);
  expect(result).toMatchObject({ review: { title: "Update Coffee", changes: [{ field: "price", before: "100", after: "120" }] } });
  expect(mocks.saveProduct).not.toHaveBeenCalled();
});
it("applies reviewed partial product changes while preserving other fields", async () => {
  const result = await reviewDashboardControl(update);
  if (!("review" in result)) throw new Error("Missing review");
  expect(await applyDashboardControl(update, result.review.revision, result.review.operationId)).toMatchObject({ success: true });
  const data = mocks.saveProduct.mock.calls[0][1] as FormData;
  expect(Object.fromEntries(data)).toMatchObject({ id, price: "120", name: "Coffee", description: "Cold brew", promoPrice: "90" });
});
it("rejects another business's product", async () => {
  mocks.product.mockResolvedValue({ ...product, businessId: "other" });
  expect(await reviewDashboardControl(update)).toHaveProperty("error");
  expect(await applyDashboardControl(update, "forged", id)).toHaveProperty("error");
  expect(mocks.saveProduct).not.toHaveBeenCalled();
});
it("rejects stale or missing reviews", async () => {
  const result = await reviewDashboardControl(update);
  if (!("review" in result)) throw new Error("Missing review");
  mocks.product.mockResolvedValue({ ...product, price: 110 });
  expect(await applyDashboardControl(update, result.review.revision, result.review.operationId)).toHaveProperty("error");
  expect(await applyDashboardControl(update, "", id)).toHaveProperty("error");
  expect(mocks.saveProduct).not.toHaveBeenCalled();
});
it("does not claim success when persistence fails", async () => {
  const result = await reviewDashboardControl(update);
  if (!("review" in result)) throw new Error("Missing review");
  mocks.saveProduct.mockResolvedValue({ error: "Database unavailable" });
  expect(await applyDashboardControl(update, result.review.revision, result.review.operationId)).toEqual({ error: "Database unavailable" });
});
it("saves a new draft using the existing quota-aware campaign action", async () => {
  const action = { kind: "SAVE_CAMPAIGN", intent: "draft", fields: { goal: "PROMOTE_PRODUCT", productId: id, platforms: ["FACEBOOK"], captions: { FACEBOOK: "Fresh coffee today." } } };
  const result = await reviewDashboardControl(action);
  if (!("review" in result)) throw new Error(JSON.stringify(result));
  expect(await applyDashboardControl(action, result.review.revision, result.review.operationId)).toMatchObject({ success: true });
  expect(mocks.persist).toHaveBeenCalledWith(expect.objectContaining({ productId: id, editId: null, captions: { FACEBOOK: "Fresh coffee today." } }), "draft", result.review.operationId);
});
it("blocks publishing when publishing is disabled", async () => {
  expect(await reviewDashboardControl({ kind: "SAVE_CAMPAIGN", intent: "publish", fields: { productId: id } })).toHaveProperty("error");
  expect(mocks.persist).not.toHaveBeenCalled();
});
it("rejects unknown commands and unsafe navigation", async () => {
  for (const action of [{ kind: "RUN_SQL", sql: "delete from products" }, { kind: "NAVIGATE", page: "https://evil.example" }, { ...update, fields: { businessId: "other" } }]) {
    expect(await reviewDashboardControl(action)).toHaveProperty("error");
  }
});
