/**
 * Language-model providers for the Keh marketing manager (server-only).
 *
 * Picks the first configured provider:
 *   1. Gemini  — GEMINI_API_KEY  (free tier; GEMINI_MODEL, default gemini-3.8-flash,
 *                then GEMINI_FALLBACK_MODELS when that model is overloaded)
 *   2. OpenAI  — OPENAI_API_KEY  (OPENAI_MODEL, default gpt-4o-mini)
 *   3. none    — the caller falls back to the guided engine
 *
 * Every provider gets the same system prompt + stateless conversation and
 * must return the model's raw JSON text, or null on any failure (quota,
 * timeout, blocked output…). Nothing here throws.
 *
 * Keeping usage down:
 *   - Thinking is capped (GEMINI_THINKING_LEVEL, default "low") and each
 *     caller sets its own output-token budget.
 *   - One request makes at most MAX_ATTEMPTS upstream calls, with no retry of
 *     the same model. A model that answered 429/404/5xx is skipped for a
 *     while (see cooldowns) instead of being asked again on the next request.
 *   - Every call logs its token usage as "[ai] <label> …" so you can see
 *     where tokens go.
 *
 * Note: on Gemini's free tier, Google may use prompts and responses to
 * improve its products — don't send data you wouldn't share.
 */

import { z } from "zod";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export type ProviderName = "gemini" | "openai";

export interface GenerateOptions {
  /** Tag for the usage log, e.g. "chat:captions" or "recommendations". */
  label: string;
  /** Output budget (for Gemini this includes any thinking tokens). */
  maxOutputTokens: number;
  /** JSON Schema the reply must follow (structured output). */
  schema?: { name: string; schema: Record<string, unknown> };
}

const TIMEOUT_MS = 30_000;
/** Upstream calls per request: the first available model plus one fallback. */
const MAX_ATTEMPTS = 2;
const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";
/** Other free-tier models, tried in order when the main one is busy. */
const DEFAULT_GEMINI_FALLBACKS = "gemini-3.7-flash,gemini-3.6-flash";

/** The provider that will answer, or null when none is configured. */
export function activeProvider(): ProviderName | null {
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
}

/** Asks the configured model for a JSON reply. Returns its text, or null. */
export async function generateJson(
  system: string,
  turns: ChatTurn[],
  options: GenerateOptions
): Promise<string | null> {
  const provider = activeProvider();
  if (provider === "gemini") return callGemini(system, turns, options);
  if (provider === "openai") return callOpenAI(system, turns, options);
  return null;
}

function logUsage(
  label: string,
  model: string,
  started: number,
  usage: { input?: number; output?: number; thinking?: number; total?: number }
) {
  console.info(
    `[ai] ${label} ${model} in=${usage.input ?? "?"} out=${usage.output ?? "?"} thinking=${usage.thinking ?? 0} total=${usage.total ?? "?"} (${((Date.now() - started) / 1000).toFixed(1)}s)`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Gemini — generateContent (stateless; nothing stored server-side)
// ─────────────────────────────────────────────────────────────────────────────

const GeminiResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z
          .object({
            parts: z.array(z.object({ text: z.string().optional(), thought: z.boolean().optional() })).optional(),
          })
          .optional(),
        finishReason: z.string().optional(),
      })
    )
    .optional(),
  promptFeedback: z.object({ blockReason: z.string().optional() }).optional(),
  usageMetadata: z
    .object({
      promptTokenCount: z.number().optional(),
      candidatesTokenCount: z.number().optional(),
      thoughtsTokenCount: z.number().optional(),
      totalTokenCount: z.number().optional(),
    })
    .optional(),
});

/**
 * Models that recently failed, and until when (epoch ms) they are skipped.
 * Per server process, which is enough to stop hammering a model that is out
 * of quota or overloaded.
 */
const cooldowns = new Map<string, number>();
const HOUR_MS = 3_600_000;

function coolDown(model: string, ms: number) {
  cooldowns.set(model, Date.now() + ms);
}

/**
 * Gemini expects the conversation to start with the user and alternate
 * roles. Trimmed history can start with an assistant turn, so drop leading
 * assistant turns and merge consecutive turns from the same side.
 */
function toGeminiContents(turns: ChatTurn[]) {
  const contents: { role: "user" | "model"; parts: { text: string }[] }[] = [];
  for (const turn of turns) {
    const role = turn.role === "assistant" ? "model" : "user";
    if (contents.length === 0 && role === "model") continue;
    const last = contents[contents.length - 1];
    if (last?.role === role) last.parts[0].text += `\n\n${turn.content}`;
    else contents.push({ role, parts: [{ text: turn.content }] });
  }
  return contents;
}

/** Main model first, then the fallbacks (comma-separated, deduplicated), minus any cooling down. */
function geminiModels(): string[] {
  const primary = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const fallbacks = (process.env.GEMINI_FALLBACK_MODELS ?? DEFAULT_GEMINI_FALLBACKS)
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  const now = Date.now();
  return [...new Set([primary, ...fallbacks])].filter((m) => (cooldowns.get(m) ?? 0) <= now);
}

/**
 * Caps thinking, which is billed as output. Gemini 3.x takes a level
 * (GEMINI_THINKING_LEVEL: minimal | low | medium | high; "minimal" isn't
 * available on Pro models); 2.x Flash takes a token budget (0 = off).
 */
function thinkingConfig(model: string): Record<string, unknown> | undefined {
  if (/^gemini-2\./.test(model)) return model.includes("flash") ? { thinkingBudget: 0 } : undefined;
  return { thinkingLevel: process.env.GEMINI_THINKING_LEVEL || "low" };
}

/** How long Google asks us to wait (RetryInfo "37s"), in ms. */
function retryDelayMs(detail: unknown): number | null {
  const details = (detail as { error?: { details?: { retryDelay?: string }[] } })?.error?.details ?? [];
  const delay = details.find((d) => typeof d.retryDelay === "string")?.retryDelay;
  const seconds = delay ? Number.parseFloat(delay) : NaN;
  return Number.isFinite(seconds) ? seconds * 1000 : null;
}

/** True when a 429 is the daily quota (not the per-minute one). */
function isDailyQuota(detail: unknown): boolean {
  return /PerDay/i.test(JSON.stringify(detail ?? ""));
}

async function callGemini(system: string, turns: ChatTurn[], options: GenerateOptions): Promise<string | null> {
  const models = geminiModels().slice(0, MAX_ATTEMPTS);
  if (models.length === 0) {
    console.warn(`[ai] ${options.label}: every Gemini model is cooling down after errors; using guided mode.`);
    return null;
  }
  // One deadline for every attempt, so the owner never waits > 30 s.
  const signal = AbortSignal.timeout(TIMEOUT_MS);

  try {
    for (const [index, model] of models.entries()) {
      const started = Date.now();
      const thinking = thinkingConfig(model);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: {
            "x-goog-api-key": process.env.GEMINI_API_KEY!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: toGeminiContents(turns),
            generationConfig: {
              responseMimeType: "application/json",
              ...(options.schema && { responseJsonSchema: options.schema.schema }),
              temperature: 0.8,
              maxOutputTokens: options.maxOutputTokens,
              ...(thinking && { thinkingConfig: thinking }),
            },
          }),
          signal,
        }
      );

      if (response.ok) return readGeminiText(options.label, model, started, await response.json());

      const detail = await response.json().catch(() => null);
      const reason = `${response.status} ${detail?.error?.status ?? ""}`.trim();
      if (response.status === 429) {
        const daily = isDailyQuota(detail);
        coolDown(model, daily ? HOUR_MS : (retryDelayMs(detail) ?? 60_000));
        console.warn(`[ai] ${options.label} ${model}: ${daily ? "daily" : "per-minute"} quota reached; skipping it for a while.`);
      } else if (response.status === 404) {
        coolDown(model, HOUR_MS);
        console.warn(`[ai] ${options.label} ${model}: model not found (retired?); skipping it for an hour.`);
      } else if (response.status >= 500) {
        coolDown(model, 20_000);
        console.warn(`[ai] ${options.label} ${model}: busy (${reason}).`);
      } else {
        // 400 etc.: another model won't do better with the same request.
        console.warn(`[ai] ${options.label} ${model} request failed: ${reason} ${detail?.error?.message?.slice(0, 200) ?? ""}`);
        return null;
      }
      if (index < models.length - 1) console.warn(`[ai] ${options.label}: trying ${models[index + 1]}.`);
    }
    return null;
  } catch (error) {
    console.error(`[ai] ${options.label}: Gemini call failed.`, error);
    return null;
  }
}

/** The answer text from a generateContent reply ("thought" parts skipped), or null. */
function readGeminiText(label: string, model: string, started: number, json: unknown): string | null {
  const parsed = GeminiResponseSchema.safeParse(json);
  if (!parsed.success) return null;
  const usage = parsed.data.usageMetadata;
  logUsage(label, model, started, {
    input: usage?.promptTokenCount,
    output: usage?.candidatesTokenCount,
    thinking: usage?.thoughtsTokenCount,
    total: usage?.totalTokenCount,
  });
  const candidate = parsed.data.candidates?.[0];
  if (!candidate) {
    console.warn(`[ai] ${label} ${model} returned no answer (${parsed.data.promptFeedback?.blockReason ?? "unknown reason"}).`);
    return null;
  }
  const text = (candidate.content?.parts ?? [])
    .filter((p) => !p.thought && p.text)
    .map((p) => p.text)
    .join("")
    .trim();
  if (!text) {
    console.warn(`[ai] ${label} ${model} returned an empty answer (finishReason: ${candidate.finishReason ?? "?"}).`);
    return null;
  }
  if (candidate.finishReason === "MAX_TOKENS") {
    console.warn(`[ai] ${label} ${model} hit its output-token budget; the reply may be cut off.`);
  }
  return text;
}

// ─────────────────────────────────────────────────────────────────────────────
// OpenAI — chat completions
// ─────────────────────────────────────────────────────────────────────────────

const OpenAIResponseSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }) })),
  usage: z
    .object({
      prompt_tokens: z.number().optional(),
      completion_tokens: z.number().optional(),
      total_tokens: z.number().optional(),
      completion_tokens_details: z.object({ reasoning_tokens: z.number().optional() }).optional(),
    })
    .optional(),
});

async function callOpenAI(system: string, turns: ChatTurn[], options: GenerateOptions): Promise<string | null> {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const started = Date.now();
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: system }, ...turns],
        response_format: options.schema
          ? { type: "json_schema", json_schema: { name: options.schema.name, schema: options.schema.schema, strict: false } }
          : { type: "json_object" },
        max_tokens: options.maxOutputTokens,
        temperature: 0.8,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      const detail = await response.json().catch(() => null);
      console.warn(`[ai] ${options.label} ${model} request failed: ${response.status} ${detail?.error?.code ?? ""}`);
      return null;
    }

    const parsed = OpenAIResponseSchema.safeParse(await response.json());
    if (!parsed.success) return null;
    const usage = parsed.data.usage;
    logUsage(options.label, model, started, {
      input: usage?.prompt_tokens,
      output: usage?.completion_tokens,
      thinking: usage?.completion_tokens_details?.reasoning_tokens,
      total: usage?.total_tokens,
    });
    return parsed.data.choices[0]?.message.content?.trim() || null;
  } catch (error) {
    console.error(`[ai] ${options.label}: OpenAI call failed.`, error);
    return null;
  }
}
