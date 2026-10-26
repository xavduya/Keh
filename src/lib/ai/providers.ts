/** Server-side Gemini adapter with bounded retries. */
import { z } from "zod";
import { isAiEnabled } from "./enabled";
import { AiGenerationError } from "./errors";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export type ProviderName = "gemini";

export interface GenerateOptions {
  /** Tag for the usage log, e.g. "chat:captions" or "recommendations". */
  label: string;
  throwOnError?: boolean;
  /** Output budget (for Gemini this includes any thinking tokens). */
  maxOutputTokens: number;
  /** JSON Schema the reply must follow (structured output). */
  schema?: { name: string; schema: Record<string, unknown> };
}

const TIMEOUT_MS = 30_000;
/** Upstream calls per request: the first available model plus one fallback. */
const MAX_ATTEMPTS = 2;
const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite";
/** Alternative Gemini models, tried in order when the main one is busy. */
const DEFAULT_GEMINI_FALLBACKS = "gemini-3.8-flash,gemini-3.7-flash";

/** The provider that will answer, or null when none is configured. */
export function activeProvider(): ProviderName | null {
  if (!isAiEnabled()) return null;
  if (process.env.GEMINI_API_KEY) return "gemini";
  return null;
}

/** Asks the configured model for a JSON reply. Returns its text, or null. */
export async function generateJson(
  system: string,
  turns: ChatTurn[],
  options: GenerateOptions
): Promise<string | null> {
  try {
    if (!isAiEnabled()) throw new AiGenerationError("AI responses are temporarily paused.");
    if (!activeProvider()) throw new AiGenerationError("Gemini isn't configured. Add GEMINI_API_KEY on the server.");
    return await callGemini(system, turns, options);
  } catch (error) {
    if (options.throwOnError) throw error;
    console.warn(`[ai] ${options.label}: generation unavailable.`);
    return null;
  }
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
    console.warn(`[ai] ${options.label}: every Gemini model is cooling down after errors.`);
    throw new AiGenerationError("Gemini is temporarily busy or out of quota. Please try again later.");
  }
  // One deadline for every attempt, so the owner never waits > 30 s.
  const signal = AbortSignal.timeout(TIMEOUT_MS);

  let failure = new AiGenerationError("Gemini is temporarily unavailable. Please try again.");
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

      if (response.ok) {
        const text = readGeminiText(options.label, model, started, await response.json());
        if (text) {
          try { JSON.parse(text); return text; } catch { /* Try the next model for malformed JSON. */ }
        }
        failure = new AiGenerationError("Gemini returned an incomplete response. Please try again.", 502);
        continue;
      }

      const detail = await response.json().catch(() => null);
      const reason = `${response.status} ${detail?.error?.status ?? ""}`.trim();
      if (response.status === 429) {
        failure = new AiGenerationError("Gemini has reached its request limit. Please try again later.", 429);
        const daily = isDailyQuota(detail);
        coolDown(model, daily ? HOUR_MS : (retryDelayMs(detail) ?? 60_000));
        console.warn(`[ai] ${options.label} ${model}: ${daily ? "daily" : "per-minute"} quota reached; skipping it for a while.`);
      } else if (response.status === 404) {
        failure = new AiGenerationError("The configured Gemini model is unavailable. Check GEMINI_MODEL on the server.");
        coolDown(model, HOUR_MS);
        console.warn(`[ai] ${options.label} ${model}: model not found (retired?); skipping it for an hour.`);
      } else if (response.status >= 500) {
        coolDown(model, 20_000);
        console.warn(`[ai] ${options.label} ${model}: busy (${reason}).`);
      } else {
        // 400 etc.: another model won't do better with the same request.
        console.warn(`[ai] ${options.label} ${model} request failed: ${reason} ${detail?.error?.message?.slice(0, 200) ?? ""}`);
        throw new AiGenerationError("Gemini rejected the request. Check the server API key and model configuration.");
      }
      if (index < models.length - 1) console.warn(`[ai] ${options.label}: trying ${models[index + 1]}.`);
    }
    throw failure;
  } catch (error) {
    if (error instanceof AiGenerationError) throw error;
    console.warn(`[ai] ${options.label}: Gemini transport failed.`);
    throw new AiGenerationError(signal.aborted
      ? "Gemini took too long to answer. Please try again."
      : "Couldn't reach Gemini. Please try again.");
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
    console.warn(`[ai] ${label} ${model} hit its output-token budget.`);
    return null;
  }
  return text;
}
