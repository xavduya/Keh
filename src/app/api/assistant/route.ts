import { NextResponse } from "next/server";
import { generateMarketingAdvice } from "@/lib/ai/ai.service";
import { createServerClient } from "@/lib/supabase/server";
import { MarketingAssistantRequestSchema } from "@/lib/validation/schemas";
import {
  getBrandProfile,
  getBusinessByOwnerId,
} from "@/services/business.service";
import { getProducts } from "@/services/product.service";
import { getPosts } from "@/services/campaign.service";
import { findings, insights, periodSummary, recommendedSlot } from "@/lib/analytics";
import { todayKey } from "@/utils/datetime";

/** Per signed-in user; every request counts (OpenAI or guided). */
const AI_LIMITS = { perMinute: 8, perDay: 100 };
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

    const limited = await checkRateLimit(supabase);
    if (limited) return limited;

    const business = await getBusinessByOwnerId(user.id);
    if (!business) {
      return NextResponse.json(
        { error: "No business profile is available for this account." },
        { status: 404 }
      );
    }

    const [products, brandProfile, posts] = await Promise.all([
      getProducts(business.id),
      getBrandProfile(business.id),
      getPosts(business.id),
    ]);
    // The business's own results, so advice and timing are based on them.
    const found = findings(posts);
    const summary = periodSummary(posts, todayKey());
    const advice = await generateMarketingAdvice(parsedRequest.data, {
      business: {
        name: business.name,
        description: business.description,
        industry: business.industry,
        location: business.location,
        targetAudience: business.targetAudience,
        preferredLanguage: business.preferredLanguage,
        operatingHours: business.operatingHours,
        delivery: business.delivery,
        payment: business.payment,
      },
      brandProfile: brandProfile
        ? {
            tone: brandProfile.tone,
            defaultCTA: brandProfile.defaultCTA,
            brandGuidelines: brandProfile.brandGuidelines?.slice(0, 500),
          }
        : null,
      products: products.slice(0, 12).map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description.slice(0, 500),
        price: product.price,
        promoPrice: product.promoPrice,
        category: product.category,
        availability: product.availability,
        aiNotes: product.aiNotes?.slice(0, 300),
      })),
      performance:
        found.measuredCount > 0
          ? {
              measuredPosts: found.measuredCount,
              avgReach: found.avgReach,
              reachGrowthPct: summary.reachGrowthPct,
              bestProductName: found.bestProduct?.value.name,
              bestPlatform: found.bestPlatform?.value,
              insights: insights(found, summary),
            }
          : null,
      slot: recommendedSlot(found),
      recentCaptions: [...posts]
        .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))
        .slice(0, 5)
        .map((post) => post.caption.slice(0, 280)),
    });

    return NextResponse.json(advice);
  } catch (error) {
    console.error("Marketing assistant request failed", error);
    return NextResponse.json(
      { error: "Keh couldn't prepare advice right now. Please try again." },
      { status: 502 }
    );
  }
}

/**
 * Records this request against the user's AI limits (migration 009).
 * Returns a 429 response when over the limit, otherwise null.
 * Fails open if the limiter itself is unavailable (e.g. migration not yet
 * applied) so the assistant keeps working — the error is logged.
 */
async function checkRateLimit(
  supabase: Awaited<ReturnType<typeof createServerClient>>
): Promise<NextResponse | null> {
  const { data, error } = await supabase.rpc("consume_ai_request", {
    per_minute: AI_LIMITS.perMinute,
    per_day: AI_LIMITS.perDay,
  });
  if (error) {
    console.error("AI rate limiter unavailable — is migration 009 applied?", error.message);
    return null;
  }

  const result = data?.[0];
  if (result?.allowed) return null;

  const retryAfter = Math.max(1, result?.retry_after_seconds ?? 60);
  const message =
    retryAfter <= 60
      ? `You're asking quickly — give Keh ${retryAfter} second${retryAfter === 1 ? "" : "s"} and try again.`
      : `You've reached today's limit of ${AI_LIMITS.perDay} assistant requests. It resets within ${Math.ceil(retryAfter / 3600)} hours.`;
  return NextResponse.json(
    { error: message },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}
