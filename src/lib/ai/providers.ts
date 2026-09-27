/**
 * Language-model providers for the Keh marketing manager (server-only).
 *
 * Picks the first configured provider:
 *   1. Gemini  — GEMINI_API_KEY  (free tier; GEMINI_MODEL, default gemini-3.8-flash)
 *   2. OpenAI  — OPENAI_API_KEY  (OPENAI_MODEL, default gpt-4o-mini)
 *   3. none    — the caller falls back to the guided engine
 *
 * Every provider gets the same system prompt + stateless conversation and
 * must return the model's raw JSON text, or null on any failure (quota,
 * timeout, blocked output…). Nothing here throws.
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

const TIMEOUT_MS = 30_000;

/** The provider that will answer, or null when none is configured. */
export function activeProvider(): ProviderName | null {
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
}

/** Asks the configured model for a JSON reply. Returns its text, or null. */
export async function generateJson(system: string, turns: ChatTurn[]): Promise<string | null> {
  const provider = activeProvider();
  if (provider === "gemini") return callGemini(system, turns);
  if (provider === "openai") return callOpenAI(system, turns);
  return null;
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
});

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

async function callGemini(system: string, turns: ChatTurn[]): Promise<string | null> {
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  try {
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
            temperature: 0.8,
            // Generous: newer models spend part of this budget on thinking.
            maxOutputTokens: 8192,
          },
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }
    );

    if (!response.ok) {
      const detail = await response.json().catch(() => null);
      console.warn(
        `Gemini (${model}) request failed: ${response.status} ${detail?.error?.status ?? ""} ${detail?.error?.message?.slice(0, 200) ?? ""}`
      );
      return null;
    }

    const parsed = GeminiResponseSchema.safeParse(await response.json());
    if (!parsed.success) return null;
    const candidate = parsed.data.candidates?.[0];
    if (!candidate) {
      console.warn(`Gemini returned no answer (${parsed.data.promptFeedback?.blockReason ?? "unknown reason"}).`);
      return null;
    }
    // Skip "thought" parts; join the answer parts.
    const text = (candidate.content?.parts ?? [])
      .filter((p) => !p.thought && p.text)
      .map((p) => p.text)
      .join("")
      .trim();
    if (!text) {
      console.warn(`Gemini returned an empty answer (finishReason: ${candidate.finishReason ?? "?"}).`);
      return null;
    }
    return text;
  } catch (error) {
    console.error("Gemini call failed.", error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OpenAI — chat completions
// ─────────────────────────────────────────────────────────────────────────────

const OpenAIResponseSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }) })),
});

async function callOpenAI(system: string, turns: ChatTurn[]): Promise<string | null> {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [{ role: "system", content: system }, ...turns],
        response_format: { type: "json_object" },
        max_tokens: 2000,
        temperature: 0.8,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      const detail = await response.json().catch(() => null);
      console.warn(`OpenAI request failed: ${response.status} ${detail?.error?.code ?? ""}`);
      return null;
    }

    const parsed = OpenAIResponseSchema.safeParse(await response.json());
    const text = parsed.success ? parsed.data.choices[0]?.message.content?.trim() : undefined;
    return text || null;
  } catch (error) {
    console.error("OpenAI call failed.", error);
    return null;
  }
}
