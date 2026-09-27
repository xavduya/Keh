/**
 * Supabase database types
 *
 * This file is the TypeScript representation of the PostgreSQL schema
 * defined in supabase/migrations/.
 *
 * HOW TO REGENERATE (after schema changes):
 *   npx supabase gen types typescript --project-id <your-project-id> \
 *     --schema public > src/lib/supabase/database.types.ts
 *
 * Or with a local Supabase CLI instance:
 *   npx supabase gen types typescript --local > src/lib/supabase/database.types.ts
 *
 * The generated file replaces this one entirely — do NOT hand-edit
 * the Json / Row / Insert / Update types below; regenerate instead.
 *
 * The manually maintained section at the bottom (typed query helpers)
 * should be preserved and updated when the schema changes.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Database enum types
// (mirrors 001_enums.sql)
// ─────────────────────────────────────────────────────────────────────────────

export type DbPlatform = "FACEBOOK" | "INSTAGRAM" | "TIKTOK";
export type DbPostStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "PUBLISHING"
  | "PUBLISHED"
  | "ACTION_REQUIRED"
  | "FAILED";
export type DbCampaignGoal =
  | "PROMOTE_PRODUCT"
  | "GET_MORE_ORDERS"
  | "GET_STORE_VISITS"
  | "ANNOUNCEMENT"
  | "NEW_PRODUCT"
  | "PROMOTION"
  | "KEEP_PAGE_ACTIVE";
export type DbAvailability = "ACTIVE" | "UNAVAILABLE";
export type DbTone =
  | "FRIENDLY"
  | "PROFESSIONAL"
  | "CASUAL"
  | "ENERGETIC"
  | "PREMIUM"
  | "FUNNY"
  | "INFORMATIVE";
export type DbLanguage = "ENGLISH" | "FILIPINO" | "TAGLISH" | "CEBUANO" | "MIXED";
export type DbDefaultCta =
  | "MESSAGE_US"
  | "VISIT_STORE"
  | "ORDER_NOW"
  | "BOOK_NOW"
  | "LEARN_MORE";
export type DbSubscriptionPlan = "FREE" | "STARTER" | "BUSINESS" | "PRO";
export type DbRecommendationType =
  | "CONTENT_FORMAT"
  | "POSTING_TIME"
  | "PRODUCT_SPOTLIGHT"
  | "CAPTION_STYLE"
  | "PLATFORM_FOCUS"
  | "CAMPAIGN_IDEA";
export type DbRecommendationSource =
  | "GENERAL_BEST_PRACTICE"
  | "BUSINESS_PROFILE"
  | "HISTORICAL_PERFORMANCE"
  | "AUDIENCE_DATA";

// ─────────────────────────────────────────────────────────────────────────────
// Row types (what SELECT returns)
// ─────────────────────────────────────────────────────────────────────────────

export type ProfileRow = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export type BusinessRow = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  industry: string;
  location: string;
  target_audience: string;
  preferred_language: DbLanguage;
  phone: string;
  website: string;
  operating_hours: string;
  delivery: string | null;
  payment: string | null;
  audience_age_group: string | null;
  audience_interests: string | null;
  created_at: string;
  updated_at: string;
}

export type BrandProfileRow = {
  id: string;
  business_id: string;
  tone: DbTone;
  preferred_language: DbLanguage;
  brand_colors: string[];
  logo_url: string | null;
  brand_image_url: string | null;
  default_cta: DbDefaultCta;
  brand_guidelines: string | null;
  created_at: string;
  updated_at: string;
}

export type SubscriptionRow = {
  id: string;
  business_id: string;
  plan: DbSubscriptionPlan;
  price_per_month: number;
  currency: string;
  renews_at: string;
  ai_campaigns_used: number;
  ai_campaigns_limit: number;
  scheduled_posts_used: number;
  scheduled_posts_limit: number;
  usage_resets_at: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export type ProductRow = {
  id: string;
  business_id: string;
  name: string;
  description: string;
  price: number;
  promo_price: number | null;
  category: string;
  image_url: string;
  product_url: string | null;
  availability: DbAvailability;
  ai_notes: string | null;
  campaign_count: number;
  created_at: string;
  updated_at: string;
}

export type SocialAccountRow = {
  id: string;
  business_id: string;
  platform: DbPlatform;
  account_name: string;
  account_id: string | null;
  connected: boolean;
  requires_manual_publish: boolean;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export type CampaignRow = {
  id: string;
  business_id: string;
  product_id: string;
  goal: DbCampaignGoal;
  promotion: string | null;
  duration: string | null;
  instructions: string | null;
  status: DbPostStatus;
  created_at: string;
  updated_at: string;
}

export type SocialPostRow = {
  id: string;
  campaign_id: string;
  product_id: string;
  platform: DbPlatform;
  title: string;
  caption: string;
  media_url: string | null;
  scheduled_at: string;
  published_at: string | null;
  status: DbPostStatus;
  external_post_id: string | null;
  created_at: string;
  updated_at: string;
}

export type PostMetricRow = {
  id: string;
  post_id: string;
  reach: number;
  impressions: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  watch_time: number | null;
  collected_at: string;
}

export type AiRecommendationRow = {
  id: string;
  business_id: string;
  type: DbRecommendationType;
  title: string;
  explanation: string;
  confidence: number | null;
  source: DbRecommendationSource;
  action_label: string | null;
  action_goal: DbCampaignGoal | null;
  dismissed_at: string | null;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Insert types (what INSERT / upsert expects — omits server-generated fields)
// ─────────────────────────────────────────────────────────────────────────────

export type InsertBusiness = Omit<BusinessRow, "id" | "created_at" | "updated_at">;
export type InsertBrandProfile = Omit<BrandProfileRow, "id" | "created_at" | "updated_at">;
export type InsertProduct = Omit<ProductRow, "id" | "campaign_count" | "created_at" | "updated_at">;
export type InsertSocialAccount = Omit<SocialAccountRow, "id" | "created_at" | "updated_at">;
export type InsertCampaign = Omit<CampaignRow, "id" | "status" | "created_at" | "updated_at">;
export type InsertSocialPost = Omit<SocialPostRow, "id" | "created_at" | "updated_at">;
export type InsertPostMetric = Omit<PostMetricRow, "id" | "collected_at">;
export type InsertAiRecommendation = Omit<AiRecommendationRow, "id" | "dismissed_at" | "created_at">;

// ─────────────────────────────────────────────────────────────────────────────
// Update types (all fields optional except the primary key)
// ─────────────────────────────────────────────────────────────────────────────

export type UpdateBusiness = Partial<InsertBusiness>;
export type UpdateBrandProfile = Partial<InsertBrandProfile>;
export type UpdateProduct = Partial<InsertProduct>;
export type UpdateCampaign = Partial<InsertCampaign> & { status?: DbPostStatus };
export type UpdateSocialPost = Partial<InsertSocialPost>;

// ─────────────────────────────────────────────────────────────────────────────
// Database interface — used to type the Supabase client
// (matches the structure expected by @supabase/supabase-js)
// ─────────────────────────────────────────────────────────────────────────────

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Omit<ProfileRow, "created_at" | "updated_at">;
        Update: Partial<Omit<ProfileRow, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      businesses: {
        Row: BusinessRow;
        Insert: InsertBusiness & { id?: string };
        Update: UpdateBusiness;
        Relationships: [];
      };
      brand_profiles: {
        Row: BrandProfileRow;
        Insert: InsertBrandProfile & { id?: string };
        Update: UpdateBrandProfile;
        Relationships: [];
      };
      subscriptions: {
        Row: SubscriptionRow;
        Insert: Omit<SubscriptionRow, "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Omit<SubscriptionRow, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      products: {
        Row: ProductRow;
        Insert: InsertProduct & { id?: string };
        Update: UpdateProduct;
        Relationships: [];
      };
      social_accounts: {
        Row: SocialAccountRow;
        Insert: InsertSocialAccount & { id?: string };
        Update: Partial<InsertSocialAccount>;
        Relationships: [];
      };
      campaigns: {
        Row: CampaignRow;
        Insert: InsertCampaign & { id?: string };
        Update: UpdateCampaign;
        Relationships: [];
      };
      social_posts: {
        Row: SocialPostRow;
        Insert: InsertSocialPost & { id?: string };
        Update: UpdateSocialPost;
        Relationships: [];
      };
      post_metrics: {
        Row: PostMetricRow;
        Insert: InsertPostMetric & { id?: string };
        Update: Record<string, never>; // metrics are immutable
        Relationships: [];
      };
      ai_recommendations: {
        Row: AiRecommendationRow;
        Insert: InsertAiRecommendation & { id?: string };
        Update: { dismissed_at?: string | null };
        Relationships: [];
      };
    };
    Enums: {
      platform: DbPlatform;
      post_status: DbPostStatus;
      campaign_goal: DbCampaignGoal;
      availability: DbAvailability;
      tone: DbTone;
      language: DbLanguage;
      default_cta: DbDefaultCta;
      subscription_plan: DbSubscriptionPlan;
      recommendation_type: DbRecommendationType;
      recommendation_source: DbRecommendationSource;
    };
    Views: Record<never, never>;
    Functions: {
      get_user_business_ids: {
        Args: Record<string, never>;
        Returns: string[];
      };
      consume_ai_request: {
        Args: { per_minute: number; per_day: number };
        Returns: { allowed: boolean; retry_after_seconds: number }[];
      };
      consume_campaign_quota: {
        Args: { p_business_id: string; p_scheduled_posts: number };
        Returns: { allowed: boolean; reason: string }[];
      };
      release_campaign_quota: {
        Args: { p_business_id: string; p_scheduled_posts: number };
        Returns: undefined;
      };
    };
    CompositeTypes: Record<never, never>;
  };
}
