import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const reply = (text = '{"answer":"Try a weekend offer."}', finishReason = "STOP") =>
  Response.json({ candidates: [{ content: { parts: [{ text }] }, finishReason }] });

describe("Gemini generation", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("AI_ENABLED", "true");
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("GEMINI_MODEL", "primary");
    vi.stubEnv("GEMINI_FALLBACK_MODELS", "fallback");
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  const options = { label: "test", maxOutputTokens: 3072, throwOnError: true };
  it("makes no network request while AI is paused", async () => {
    vi.stubEnv("AI_ENABLED", "false");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const { generateJson, activeProvider } = await import("./providers");
    expect(activeProvider()).toBeNull();
    await expect(generateJson("system", [], options)).rejects.toThrow("paused");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("returns Gemini JSON and never selects OpenAI", async () => {
    const fetch = vi.fn().mockResolvedValue(reply());
    vi.stubGlobal("fetch", fetch);
    const { generateJson, activeProvider } = await import("./providers");
    expect(await generateJson("system", [{ role: "user", content: "ideas" }], options)).toContain("weekend");
    expect(fetch.mock.calls[0][0]).toContain("generativelanguage.googleapis.com");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "unused");
    expect(activeProvider()).toBeNull();
    await expect(generateJson("system", [], options)).rejects.toThrow("isn't configured");
  });
  it.each([reply(""), reply('{"answer":'), reply('{"answer":"partial"}', "MAX_TOKENS"), Response.json({}, { status: 503 })])(
    "recovers from unusable output or transient failure with one fallback", async (first) => {
      const fetch = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(reply());
      vi.stubGlobal("fetch", fetch);
      const { generateJson } = await import("./providers");
      expect(await generateJson("system", [], options)).toContain("weekend");
      expect(fetch).toHaveBeenCalledTimes(2);
    }
  );
  it("surfaces quota errors without sending repeated requests to cooling models", async () => {
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(Response.json({}, { status: 429 })));
    vi.stubGlobal("fetch", fetch);
    const { generateJson } = await import("./providers");
    await expect(generateJson("system", [], options)).rejects.toMatchObject({ status: 429 });
    await expect(generateJson("system", [], options)).rejects.toThrow("quota");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
