/**
 * Keh — Application constants
 *
 * Centralised source of truth for all static values used across the app:
 * platform metadata, post statuses, campaign goals, navigation, and limits.
 */

import type {
  Platform,
  PostStatus,
  CampaignGoal,
  Tone,
  Language,
  DefaultCTA,
} from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Platforms
// ─────────────────────────────────────────────────────────────────────────────

export interface PlatformMeta {
  value: Platform;
  label: string;
  /** Single character / symbol shown in the prototype platform badge */
  symbol: string;
  /** Whether this platform supports automatic publishing */
  autoPublish: boolean;
  /** Human-readable publishing note shown in the UI */
  publishNote: string;
}

export const PLATFORMS: PlatformMeta[] = [
  {
    value: "FACEBOOK",
    label: "Facebook",
    symbol: "f",
    autoPublish: true,
    publishNote: "Automatic publishing supported.",
  },
  {
    value: "INSTAGRAM",
    label: "Instagram",
    symbol: "◎",
    autoPublish: true,
    publishNote: "Automatic publishing supported.",
  },
  {
    value: "TIKTOK",
    label: "TikTok",
    symbol: "♪",
    autoPublish: false,
    publishNote:
      "Manual action required: add audio and publish in TikTok.",
  },
];

export const PLATFORM_VALUES = PLATFORMS.map((p) => p.value) as Platform[];

export function getPlatformMeta(value: Platform): PlatformMeta {
  return PLATFORMS.find((p) => p.value === value) ?? PLATFORMS[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Post statuses
// ─────────────────────────────────────────────────────────────────────────────

export interface PostStatusMeta {
  value: PostStatus;
  label: string;
  /** CSS utility class suffix used in globals.css */
  pillClass: string;
  /** Optional prefix symbol shown in the badge */
  prefix?: string;
}

export const POST_STATUSES: PostStatusMeta[] = [
  {
    value: "DRAFT",
    label: "Draft",
    pillClass: "pill-draft",
  },
  {
    value: "SCHEDULED",
    label: "Scheduled",
    pillClass: "pill-scheduled",
  },
  {
    value: "PUBLISHING",
    label: "Publishing",
    pillClass: "pill-scheduled",
  },
  {
    value: "PUBLISHED",
    label: "Published",
    pillClass: "pill-published",
    prefix: "✓ ",
  },
  {
    value: "ACTION_REQUIRED",
    label: "Action Required",
    pillClass: "pill-action-required",
  },
  {
    value: "FAILED",
    label: "Failed",
    pillClass: "pill-failed",
  },
];

export function getPostStatusMeta(value: PostStatus): PostStatusMeta {
  return POST_STATUSES.find((s) => s.value === value) ?? POST_STATUSES[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Campaign goals
// ─────────────────────────────────────────────────────────────────────────────

export interface CampaignGoalMeta {
  value: CampaignGoal;
  /** Human-readable label shown in the wizard */
  label: string;
  /** Lucide icon name */
  icon: string;
}

export const CAMPAIGN_GOALS: CampaignGoalMeta[] = [
  { value: "PROMOTE_PRODUCT",  label: "Promote a product",    icon: "Package" },
  { value: "GET_MORE_ORDERS",  label: "Get more orders",      icon: "ShoppingCart" },
  { value: "GET_STORE_VISITS", label: "Get more store visits", icon: "MapPin" },
  { value: "ANNOUNCEMENT",     label: "Announce something",   icon: "Megaphone" },
  { value: "NEW_PRODUCT",      label: "Launch a new product", icon: "Sparkles" },
  { value: "PROMOTION",        label: "Promote a discount",   icon: "Tag" },
  { value: "KEEP_PAGE_ACTIVE", label: "Keep my page active",  icon: "Heart" },
];

export function getCampaignGoalMeta(value: CampaignGoal): CampaignGoalMeta {
  return CAMPAIGN_GOALS.find((g) => g.value === value) ?? CAMPAIGN_GOALS[0];
}

/** Human-readable label for a goal value, with graceful fallback. */
export function goalLabel(value: CampaignGoal | ""): string {
  if (!value) return "—";
  return getCampaignGoalMeta(value).label;
}

// ─────────────────────────────────────────────────────────────────────────────
// Brand voice options
// ─────────────────────────────────────────────────────────────────────────────

export const TONE_OPTIONS: Tone[] = [
  "FRIENDLY",
  "PROFESSIONAL",
  "CASUAL",
  "ENERGETIC",
  "PREMIUM",
  "FUNNY",
  "INFORMATIVE",
];

export const TONE_LABELS: Record<Tone, string> = {
  FRIENDLY: "Friendly",
  PROFESSIONAL: "Professional",
  CASUAL: "Casual",
  ENERGETIC: "Energetic",
  PREMIUM: "Premium",
  FUNNY: "Funny",
  INFORMATIVE: "Informative",
};

export const LANGUAGE_OPTIONS: Language[] = [
  "ENGLISH",
  "FILIPINO",
  "TAGLISH",
  "CEBUANO",
  "MIXED",
];

export const LANGUAGE_LABELS: Record<Language, string> = {
  ENGLISH: "English",
  FILIPINO: "Filipino",
  TAGLISH: "Taglish",
  CEBUANO: "Cebuano",
  MIXED: "Mixed",
};

export const DEFAULT_CTA_OPTIONS: DefaultCTA[] = [
  "MESSAGE_US",
  "VISIT_STORE",
  "ORDER_NOW",
  "BOOK_NOW",
  "LEARN_MORE",
];

export const DEFAULT_CTA_LABELS: Record<DefaultCTA, string> = {
  MESSAGE_US: "Message Us",
  VISIT_STORE: "Visit Store",
  ORDER_NOW: "Order Now",
  BOOK_NOW: "Book Now",
  LEARN_MORE: "Learn More",
};

// ─────────────────────────────────────────────────────────────────────────────
// Navigation
// ─────────────────────────────────────────────────────────────────────────────

export interface NavItem {
  id: string;
  label: string;
  /** Lucide icon name */
  icon: string;
  href: string;
  /** Show an "AI" badge next to this nav item */
  aiBadge?: boolean;
}

/** Main workspace navigation — matches prototype nav array */
export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard",      label: "Home",                     icon: "Home",          href: "/dashboard" },
  { id: "assistant",      label: "AI Marketing Assistant",   icon: "Sparkles",      href: "/assistant",       aiBadge: true },
  { id: "campaigns",      label: "Campaigns",                icon: "Plus",          href: "/campaigns" },
  { id: "calendar",       label: "Calendar",                 icon: "Calendar",      href: "/calendar" },
  { id: "content",        label: "Content",                  icon: "FileText",      href: "/content" },
  { id: "products",       label: "Products & Services",      icon: "Package",       href: "/products" },
  { id: "analytics",      label: "Analytics",                icon: "BarChart2",     href: "/analytics" },
  { id: "brand",          label: "Brand Profile",            icon: "Layers",        href: "/brand" },
  { id: "social-accounts",label: "Social Accounts",         icon: "Link",          href: "/social-accounts" },
];

/** Bottom navigation (outside the main workspace section) */
export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { id: "subscription", label: "Subscription", icon: "CreditCard", href: "/subscription" },
  { id: "settings",     label: "Settings",     icon: "Settings",   href: "/settings" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Subscription plans
// ─────────────────────────────────────────────────────────────────────────────

export interface SubscriptionPlanMeta {
  id: string;
  name: string;
  pricePerMonth: number;
  currency: string;
  businesses: number;
  socialAccounts: number;
  scheduledPostsPerMonth: number;
  aiCampaignsPerMonth: number;
  /** Language-model calls (assistant messages + recommendation refreshes) per user per day. */
  aiRequestsPerDay: number;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlanMeta[] = [
  {
    id: "FREE",
    name: "Free",
    pricePerMonth: 0,
    currency: "PHP",
    businesses: 1,
    socialAccounts: 2,
    scheduledPostsPerMonth: 10,
    aiCampaignsPerMonth: 5,
    aiRequestsPerDay: 20,
  },
  {
    id: "STARTER",
    name: "Starter",
    pricePerMonth: 399,
    currency: "PHP",
    businesses: 1,
    socialAccounts: 4,
    scheduledPostsPerMonth: 60,
    aiCampaignsPerMonth: 50,
    aiRequestsPerDay: 60,
  },
  {
    id: "BUSINESS",
    name: "Business",
    pricePerMonth: 799,
    currency: "PHP",
    businesses: 3,
    socialAccounts: 8,
    scheduledPostsPerMonth: 150,
    aiCampaignsPerMonth: 120,
    aiRequestsPerDay: 120,
  },
  {
    id: "PRO",
    name: "Pro",
    pricePerMonth: 1499,
    currency: "PHP",
    businesses: 10,
    socialAccounts: 20,
    scheduledPostsPerMonth: 500,
    aiCampaignsPerMonth: 400,
    aiRequestsPerDay: 300,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Misc
// ─────────────────────────────────────────────────────────────────────────────

/** Default timezone for scheduling */
export const DEFAULT_TIMEZONE = "Asia/Manila";

/** Prototype demo date (anchor for all sample data) */
export const DEMO_DATE = "2026-09-26";

/** Maximum file upload size in bytes (5 MB) */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
