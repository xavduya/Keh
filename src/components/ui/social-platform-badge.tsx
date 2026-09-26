import type { Platform } from "@/types";

interface SocialPlatformBadgeProps {
  platform: Platform;
  size?: "sm" | "md";
}

const PLATFORM_CONFIG: Record<
  Platform,
  { symbol: string; className: string }
> = {
  FACEBOOK: {
    symbol: "f",
    className: "bg-[#1877f2] text-white font-bold",
  },
  INSTAGRAM: {
    symbol: "◎",
    className:
      "bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#515bd4] text-white",
  },
  TIKTOK: {
    symbol: "♪",
    className: "bg-[#010101] text-white",
  },
};

export function SocialPlatformBadge({
  platform,
  size = "md",
}: SocialPlatformBadgeProps) {
  const { symbol, className } = PLATFORM_CONFIG[platform];

  const sizeClasses =
    size === "sm"
      ? "w-[22px] h-[22px] text-[11px]"
      : "w-[28px] h-[28px] text-[13px]";

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full shrink-0 ${sizeClasses} ${className}`}
      aria-label={platform}
    >
      {symbol}
    </span>
  );
}

interface PlatformGroupProps {
  platforms: Platform[];
  size?: "sm" | "md";
}

export function PlatformGroup({ platforms, size = "md" }: PlatformGroupProps) {
  return (
    <span className="inline-flex items-center">
      {platforms.map((platform, index) => (
        <span key={platform} className={index > 0 ? "-ml-1" : ""}>
          <SocialPlatformBadge platform={platform} size={size} />
        </span>
      ))}
    </span>
  );
}
