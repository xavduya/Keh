import { NextResponse } from "next/server";
import { generateMarketingAdvice } from "@/lib/ai/ai.service";
import { createServerClient } from "@/lib/supabase/server";
import { MarketingAssistantRequestSchema } from "@/lib/validation/schemas";
import { getBusinessByOwnerId } from "@/services/business.service";
import { buildMarketingContext } from "@/lib/ai/context";
import { consumeAiRequest } from "@/lib/ai/rate-limit";

const MAX_BODY_BYTES = 24_000;

export async function POST(request: Request) {
  // Measure the body itself — a Content-Length header can be omitted.
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "That request is too large. Shorten your message and try again." },
      { status: 413 }
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { error: "Send a valid JSON request." },
      { status: 400 }
    );
  }

  const parsedRequest = MarketingAssistantRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return NextResponse.json(
      {
        error:
          parsedRequest.error.issues[0]?.message ??
          "Check your message and try again.",
      },
      { status: 400 }
    );
  }

  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError?.name === "AuthSessionMissingError") {
      return NextResponse.json(
        { error: "Sign in to ask your marketing assistant." },
        { status: 401 }
      );
    }
    if (authError) {
      console.error("Could not verify the marketing assistant session", authError);
      return NextResponse.json(
        { error: "We couldn't verify your session. Please try again." },
        { status: 503 }
      );
    }
    if (!user) {
      return NextResponse.json(
        { error: "Sign in to ask your marketing assistant." },
        { status: 401 }
      );
    }

    const limit = await consumeAiRequest();
    if (!limit.allowed) {
      return NextResponse.json(
        { error: limit.message },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      );
    }

    const business = await getBusinessByOwnerId(user.id);
    if (!business) {
      return NextResponse.json(
        { error: "No business profile is available for this account." },
        { status: 404 }
      );
    }

    const { context } = await buildMarketingContext(business);
    const advice = await generateMarketingAdvice(parsedRequest.data, context);

    return NextResponse.json(advice);
  } catch (error) {
    console.error("Marketing assistant request failed", error);
    return NextResponse.json(
      { error: "Keh couldn't prepare advice right now. Please try again." },
      { status: 502 }
    );
  }
}
