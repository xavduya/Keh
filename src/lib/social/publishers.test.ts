import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { facebookPublisher, instagramPublisher } from "./publishers";

type Call = { url: URL; method: string; body: URLSearchParams | null };

/** Replies are matched in order; each is [status, json]. */
function mockGraph(replies: [number, unknown][]) {
  const calls: Call[] = [];
  const fetchMock = vi.fn(async (input: URL | string, init?: RequestInit) => {
    calls.push({
      url: new URL(String(input)),
      method: init?.method ?? "GET",
      body: init?.body instanceof URLSearchParams ? init.body : null,
    });
    const [status, json] = replies.shift() ?? [500, { error: { message: "unexpected call" } }];
    return new Response(JSON.stringify(json), { status });
  });
  vi.stubGlobal("fetch", fetchMock);
  return calls;
}

const account = { accountId: "PAGE1", accessToken: "TOKEN" };

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Facebook publisher", () => {
  it("posts a photo with the caption and returns the feed post ID", async () => {
    const calls = mockGraph([[200, { id: "PHOTO1", post_id: "PAGE1_POST1" }]]);
    const result = await facebookPublisher.publish(
      { id: "p1", platform: "FACEBOOK", caption: "Hello", mediaUrl: "https://x.supabase.co/a.jpg" },
      account
    );
    expect(result).toEqual({ ok: true, externalPostId: "PAGE1_POST1" });
    expect(calls[0].method).toBe("POST");
    expect(calls[0].url.pathname).toMatch(/\/PAGE1\/photos$/);
    expect(calls[0].body?.get("url")).toBe("https://x.supabase.co/a.jpg");
    expect(calls[0].body?.get("caption")).toBe("Hello");
  });

  it("posts text to the feed when there's no photo", async () => {
    const calls = mockGraph([[200, { id: "PAGE1_POST2" }]]);
    const result = await facebookPublisher.publish({ id: "p1", platform: "FACEBOOK", caption: "Hi" }, account);
    expect(result).toEqual({ ok: true, externalPostId: "PAGE1_POST2" });
    expect(calls[0].url.pathname).toMatch(/\/PAGE1\/feed$/);
    expect(calls[0].body?.get("message")).toBe("Hi");
  });

  it("asks the owner to reconnect when the token is invalid", async () => {
    mockGraph([[400, { error: { message: "Session has expired", code: 190 } }]]);
    const result = await facebookPublisher.publish({ id: "p1", platform: "FACEBOOK", caption: "Hi" }, account);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(/Reconnect it in Social accounts/);
  });

  it("keeps engagement counts when reach insights aren't available", async () => {
    mockGraph([
      [200, { reactions: { summary: { total_count: 12 } }, comments: { summary: { total_count: 3 } }, shares: { count: 2 } }],
      [400, { error: { message: "metric not available", code: 100 } }],
    ]);
    const insights = await facebookPublisher.getInsights("PAGE1_POST1", account);
    expect(insights).toMatchObject({ likes: 12, comments: 3, shares: 2, reach: 0 });
  });
});

describe("Instagram publisher", () => {
  const post = { id: "p1", platform: "INSTAGRAM" as const, caption: "Hi", mediaUrl: "https://x.supabase.co/a.jpg" };

  it("needs a photo and doesn't call Instagram without one", async () => {
    const calls = mockGraph([]);
    const result = await instagramPublisher.publish({ ...post, mediaUrl: undefined }, account);
    expect(result.ok).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it("creates a container, waits for it, then publishes", async () => {
    const calls = mockGraph([
      [200, { id: "CONTAINER1" }],
      [200, { status_code: "FINISHED" }],
      [200, { id: "MEDIA1" }],
    ]);
    const result = await instagramPublisher.publish(post, account);
    expect(result).toEqual({ ok: true, externalPostId: "MEDIA1" });
    expect(calls.map((c) => c.url.pathname.split("/").slice(-2).join("/"))).toEqual([
      "PAGE1/media",
      "v22.0/CONTAINER1",
      "PAGE1/media_publish",
    ]);
    expect(calls[2].body?.get("creation_id")).toBe("CONTAINER1");
  });

  it("explains when Instagram can't use the photo", async () => {
    mockGraph([
      [200, { id: "CONTAINER1" }],
      [200, { status_code: "ERROR" }],
    ]);
    const result = await instagramPublisher.publish(post, account);
    expect(!result.ok && result.error).toMatch(/JPG/);
  });

  it("falls back to a smaller metric set when one is retired", async () => {
    mockGraph([
      [400, { error: { message: "views is not supported", code: 100 } }],
      [200, { data: [{ name: "reach", values: [{ value: 540 }] }, { name: "saved", values: [{ value: 7 }] }] }],
    ]);
    const insights = await instagramPublisher.getInsights("MEDIA1", account);
    expect(insights).toMatchObject({ reach: 540, saves: 7 });
  });
});
