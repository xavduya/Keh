/**
 * Keh — Domain types
 *
 * All primary domain entities are defined here as TypeScript interfaces.
 * These types mirror the target database schema and are used throughout the
 * application to replace the untyped state object from the prototype.
 *
 * Hierarchy:
 *   User
 *   └── Business
 *       ├── BrandProfile
 *       ├── Product[]
 *       ├── SocialAccount[]
 *       ├── Campaign[]
 *       │   └── SocialPost[]
 *       │       └── PostMetric[]
 *       ├── AIRecommendation[]
 *       └── Subscription
 */

// ─────────────────────────────────────────────────────────────────────────────
// Enums / union types  (kept as string unions for now; will become DB enums)
// ─────────────────────────────────────────────────────────────────────────────

export type Platform = "FACEBOOK" | "INSTAGRAM" | "TIKTOK";

export type PostStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "PUBLISHING"
  | "PUBLISHED"
  | "ACTION_REQUIRED"
  | "FAILED";

export type CampaignGoal =
  | "PROMOTE_PRODUCT"
  | "GET_MORE_ORDERS"
  | "GET_STORE_VISITS"
  | "ANNOUNCEMENT"
  | "NEW_PRODUCT"
  | "PROMOTION"
  | "KEEP_PAGE_ACTIVE";

export type RecommendationSource =
  | "GENERAL_BEST_PRACTICE"
  | "BUSINESS_PROFILE"
  | "HISTORICAL_PERFORMANCE"
  | "AUDIENCE_DATA";

export type RecommendationType =
  | "CONTENT_FORMAT"
  | "POSTING_TIME"
  | "PRODUCT_SPOTLIGHT"
  | "CAPTION_STYLE"
  | "PLATFORM_FOCUS"
  | "CAMPAIGN_IDEA";

export type Availability = "ACTIVE" | "UNAVAILABLE";

export type Tone =
  | "FRIENDLY"
  | "PROFESSIONAL"
  | "CASUAL"
  | "ENERGETIC"
  | "PREMIUM"
  | "FUNNY"
  | "INFORMATIVE";

export type Language = "ENGLISH" | "FILIPINO" | "TAGLISH" | "CEBUANO" | "MIXED";

export type DefaultCTA =
  | "MESSAGE_US"
  | "VISIT_STORE"
  | "ORDER_NOW"
  | "BOOK_NOW"
  | "LEARN_MORE";

export type SubscriptionPlan = "FREE" | "STARTER" | "BUSINESS" | "PRO";

// ─────────────────────────────────────────────────────────────────────────────
// User
// ─────────────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Business
// ─────────────────────────────────────────────────────────────────────────────

export interface Business {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  industry: string;
  location: string;
  targetAudience: string;
  preferredLanguage: Language;
  phone: string;
  website: string;
  operatingHours: string;
  delivery?: string;
  payment?: string;
  /** Age group of the primary audience e.g. "18–35" */
  audienceAgeGroup?: string;
  audienceInterests?: string;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Brand Profile
// ─────────────────────────────────────────────────────────────────────────────

export interface BrandProfile {
  businessId: string;
  tone: Tone;
  preferredLanguage: Language;
  brandColors: string[];
  logoUrl?: string;
  brandImageUrl?: string;
  defaultCTA: DefaultCTA;
  brandGuidelines?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Product
// ─────────────────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  businessId: string;
  name: string;
  description: string;
  price: number;
  /** Promotional / discounted price */
  promoPrice?: number;
  category: string;
  imageUrl: string;
  productUrl?: string;
  availability: Availability;
  /** Notes for AI content generation */
  aiNotes?: string;
  /** Number of campaigns this product has appeared in */
  campaignCount?: number;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Social Account
// ─────────────────────────────────────────────────────────────────────────────

export interface SocialAccount {
  id: string;
  businessId: string;
  platform: Platform;
  /** e.g. "@juanscafe" or "Juan's Café" */
  accountName: string;
  accountId?: string;
  /** Whether the OAuth connection is currently valid */
  connected: boolean;
  /** Whether publishing for this platform requires manual action (e.g. TikTok) */
  requiresManualPublish: boolean;
  lastSyncedAt?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Campaign
// ─────────────────────────────────────────────────────────────────────────────

export interface Campaign {
  id: string;
  businessId: string;
  productId: string;
  goal: CampaignGoal;
  /** Human-readable promotion description e.g. "15% off" */
  promotion?: string;
  /** Duration string e.g. "Friday – Sunday" */
  duration?: string;
  /** Additional instructions given by the business owner */
  instructions?: string;
  status: PostStatus;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Social Post
// ─────────────────────────────────────────────────────────────────────────────

export interface SocialPost {
  id: string;
  campaignId: string;
  /** Denormalized for convenience — matches Campaign.productId */
  productId: string;
  platform: Platform;
  title: string;
  caption: string;
  mediaUrl?: string;
  scheduledAt: string;
  publishedAt?: string;
  status: PostStatus;
  /** ID of the post on the external platform after publishing */
  externalPostId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Post Metric
// ─────────────────────────────────────────────────────────────────────────────

export interface PostMetric {
  id: string;
  postId: string;
  reach: number;
  impressions: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  /** TikTok / Reels watch time in seconds */
  watchTime?: number;
  collectedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Recommendation
// ─────────────────────────────────────────────────────────────────────────────

export interface AIRecommendation {
  id: string;
  businessId: string;
  type: RecommendationType;
  title: string;
  explanation: string;
  /** 0–1 confidence score */
  confidence?: number;
  source: RecommendationSource;
  /** Optional action the user can take from this recommendation */
  actionLabel?: string;
  /** Suggested campaign goal if the user acts on this recommendation */
  actionGoal?: CampaignGoal;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Subscription
// ─────────────────────────────────────────────────────────────────────────────

export interface SubscriptionUsage {
  aiCampaignsUsed: number;
  aiCampaignsLimit: number;
  scheduledPostsUsed: number;
  scheduledPostsLimit: number;
  resetsAt: string;
}

export interface Subscription {
  id: string;
  businessId: string;
  plan: SubscriptionPlan;
  pricePerMonth: number;
  currency: string;
  renewsAt: string;
  usage: SubscriptionUsage;
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience composite types used in the UI
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A social post enriched with its product and per-platform reach.
 * Used in the calendar, content library, and analytics pages.
 *
 * `platforms` is a convenience array (always `[platform]`) so UI
 * components can iterate without branching on the singular field.
 */
export interface EnrichedPost extends SocialPost {
  product: Product;
  reach: number;
  /** Convenience array — always `[platform]` */
  platforms: Platform[];
}

/**
 * A post with its latest collected metrics. All numbers are 0 until the
 * platform metrics for the post have been collected into post_metrics.
 */
export interface PostPerformance extends EnrichedPost {
  /** likes + comments + shares + saves */
  interactions: number;
  clicks: number;
}

/**
 * A campaign enriched with its posts and product.
 * Used in the campaign review and analytics pages.
 */
export interface EnrichedCampaign extends Campaign {
  product: Product;
  posts: SocialPost[];
}

/**
 * The in-progress campaign creation state.
 * Separate from Campaign because it spans multiple wizard steps
 * and may not yet have an ID or businessId.
 */
export interface CampaignDraft {
  goal: CampaignGoal | "";
  productId: string;
  promotion: string;
  duration: string;
  instructions: string;
  scheduledDate: string;
  scheduledTime: string;
  platforms: Platform[];
  /** Platform-specific captions keyed by Platform */
  captions: Partial<Record<Platform, string>>;
  /** ID of the post being edited; null for new */
  editId: string | null;
}
