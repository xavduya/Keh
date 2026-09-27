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

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 24_000) {
    return NextResponse.json(
      { error: "That request is too large. Shorten your message and try again." },
      { status: 413 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
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
