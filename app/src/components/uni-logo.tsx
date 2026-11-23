/* eslint-disable @next/next/no-img-element -- logos may come from Supabase Storage or any URL an admin pastes */
import { clsx } from "clsx";

type Uni = { name: string; short_name?: string | null; brand_color?: string | null; logo_url?: string | null };

/** University logo tile; falls back to brand-colored initials when no logo is set. */
export function UniLogo({ uni, size = 48, className }: { uni: Uni; size?: number; className?: string }) {
  const radius = Math.round(size * 0.26);
  if (uni.logo_url) {
    return (
      <img
        src={uni.logo_url}
        alt={`${uni.name} logo`}
        width={size}
        height={size}
        loading="lazy"
        className={clsx("shrink-0 bg-white object-cover shadow-lg ring-1 ring-white/10", className)}
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }
  return (
    <span
      className={clsx("flex shrink-0 items-center justify-center font-extrabold text-white shadow-lg ring-1 ring-white/10", className)}
      style={{ width: size, height: size, borderRadius: radius, fontSize: Math.max(10, size * 0.24), background: `linear-gradient(145deg, ${uni.brand_color ?? "#16542F"}, #07130c)` }}
      aria-label={uni.name}
    >
      {uni.short_name ?? uni.name.slice(0, 3)}
    </span>
  );
}
