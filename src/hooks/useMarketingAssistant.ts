"use client";

/**
 * useMarketingAssistant — shared conversation state for the Keh AI
 * marketing manager (assistant page, floating copilot, in-wizard copilot).
 *
 * Talks to POST /api/assistant, keeps the message list, and hands any
 * campaign "action" (fields the AI filled) to the caller via `onAction`.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AssistantIntent,
  AssistantMessage,
  CampaignDraft,
  MarketingCampaignAction,
} from "@/types";
import { MarketingAssistantResponseSchema } from "@/lib/validation/schemas";

/** Messages sent back as conversation history (the API accepts up to 8; the model sees 4). */
const HISTORY_LENGTH = 4;

export interface AskOptions {
  intent?: AssistantIntent;
  /** The wizard's current draft, so the AI edits instead of starting over. */
  currentDraft?: CampaignDraft;
  currentStep?: number;
}

export const READ_CAMPAIGN_CONTEXT_EVENT = "keh:read-campaign-context";
export type CampaignContextRequest = { receive: (snapshot: { currentDraft: CampaignDraft; currentStep: number }) => void };
function currentWizardContext(): Pick<AskOptions, "currentDraft" | "currentStep"> {
  let snapshot: Pick<AskOptions, "currentDraft" | "currentStep"> = {};
  window.dispatchEvent(new CustomEvent<CampaignContextRequest>(READ_CAMPAIGN_CONTEXT_EVENT, { detail: { receive: (value) => { snapshot = value; } } }));
  return snapshot;
}

export function useMarketingAssistant({
  onAction,
}: {
  /** Called when the AI filled campaign fields. */
  onAction?: (action: MarketingCampaignAction) => void;
} = {}) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIntent, setActiveIntent] = useState<AssistantIntent>("chat");
  const [error, setError] = useState("");
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => { pending.current?.abort(); pending.current = null; }, []);
  // Latest messages for building history without re-creating `ask`.
  const messagesRef = useRef<AssistantMessage[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const ask = useCallback(
    async (question: string, options: AskOptions = {}) => {
      const text = question.trim();
      if (!text || pending.current) return null;
      const wizard = options.currentDraft ? options : { ...currentWizardContext(), ...options };
      const controller = new AbortController();
      pending.current = controller;
      const timeout = setTimeout(() => controller.abort(), 55_000);

      setError("");
      setLoading(true);
      setActiveIntent(options.intent ?? "chat");
      const history = messagesRef.current
        .slice(-HISTORY_LENGTH)
        .map(({ role, content }) => ({ role, content: content.slice(0, 800) }));
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: text }]);

      try {
        const response = await fetch("/api/assistant", {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: text,
            history,
            actionIntent: options.intent ?? "chat",
            currentDraft: wizard.currentDraft,
            currentStep: wizard.currentStep,
          }),
        });
        const raw: unknown = await response.json().catch(() => null);
        if (pending.current !== controller) return null;
        if (!response.ok) {
          const message = raw && typeof raw === "object" && "error" in raw && typeof raw.error === "string"
            ? raw.error : "Keh couldn't answer right now. Please try again.";
          throw new Error(message);
        }
        const parsed = MarketingAssistantResponseSchema.safeParse(raw);
        if (!parsed.success || !parsed.data.answer.trim()) throw new Error("Keh returned an incomplete response. Please try again.");
        const data = parsed.data;

        const reply: AssistantMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.answer,
          mode: data.mode,
          control: data.control,
          action: data.action,
          ideas: data.ideas,
        };
        setMessages((prev) => [...prev, reply]);
        if (data.action?.draftUpdates && data.action.changes.length > 0) {
          onAction?.(data.action);
        }
        return reply;
      } catch (err) {
        if (pending.current !== controller) return null;
        setError(controller.signal.aborted ? "Keh took too long to answer. Please try again." : err instanceof Error ? err.message : "Keh couldn't answer right now. Please try again.");
        return null;
      } finally {
        clearTimeout(timeout);
        if (pending.current === controller) {
          pending.current = null;
          setLoading(false);
        }
      }
    },
    [onAction]
  );

  const reset = useCallback(() => {
    pending.current?.abort();
    pending.current = null;
    messagesRef.current = [];
    setLoading(false);
    setMessages([]);
    setError("");
  }, []);

  const cancel = useCallback(() => {
    pending.current?.abort();
    pending.current = null;
    setLoading(false);
    setError("Generation stopped. You can send another request.");
  }, []);

  return { messages, ask, loading, activeIntent, cancel, error, reset };
}

// ─────────────────────────────────────────────────────────────────────────────
// Handing an AI-filled campaign to the wizard
// ─────────────────────────────────────────────────────────────────────────────

const PENDING_KEY = "keh_pending_ai_campaign";
/** Fired on window when the AI fills fields while the wizard is open. */
export const APPLY_AI_CAMPAIGN_EVENT = "keh:apply-ai-campaign";
/** Fired on window to open the floating copilot (detail: { prompt? }). */
export const OPEN_AI_COPILOT_EVENT = "keh:open-ai-copilot";

export type PendingAiCampaign = Pick<
  MarketingCampaignAction,
  "draftUpdates" | "changes" | "summary" | "suggestedStep"
>;

function toPending(action: MarketingCampaignAction): PendingAiCampaign {
  return {
    draftUpdates: action.draftUpdates,
    changes: action.changes,
    summary: action.summary,
    suggestedStep: action.suggestedStep,
  };
}

/** Saves an AI-filled campaign for the wizard to pick up on its next load. */
export function stashPendingAiCampaign(action: MarketingCampaignAction) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(toPending(action)));
  } catch {
    // Storage unavailable (private mode) — the wizard just opens empty.
  }
}

/** Reads and clears a stashed AI-filled campaign. Call after mount only. */
export function takePendingAiCampaign(): PendingAiCampaign | null {
  try {
    const stored = sessionStorage.getItem(PENDING_KEY);
    if (!stored) return null;
    sessionStorage.removeItem(PENDING_KEY);
    return JSON.parse(stored) as PendingAiCampaign;
  } catch {
    return null;
  }
}

/** Applies an AI-filled campaign to the wizard that is open on this page. */
export function dispatchAiCampaign(action: MarketingCampaignAction) {
  window.dispatchEvent(new CustomEvent(APPLY_AI_CAMPAIGN_EVENT, { detail: toPending(action) }));
}

/** Fired on window to ask the in-wizard copilot something (detail: { prompt, intent }). */
export const WIZARD_ASK_EVENT = "keh:wizard-ask";

/** Asks the in-wizard copilot, which sends the current draft along. */
export function askWizardCopilot(prompt: string, intent: AssistantIntent = "chat") {
  window.dispatchEvent(new CustomEvent(WIZARD_ASK_EVENT, { detail: { prompt, intent } }));
}

/** Opens the floating copilot, optionally pre-filling its input. */
export function openAiCopilot(prompt?: string) {
  window.dispatchEvent(new CustomEvent(OPEN_AI_COPILOT_EVENT, { detail: { prompt } }));
}
