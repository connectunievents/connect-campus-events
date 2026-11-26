/* eslint-disable @next/next/no-img-element -- sponsor logos come from Supabase Storage or any URL */
import Link from "next/link";
import { MapPin } from "lucide-react";
import { CATEGORIES, industryLabel, type SponsorProfile } from "@/lib/types";

export function SponsorAvatar({ p, size = 56 }: { p: Pick<SponsorProfile, "name" | "logo_url">; size?: number }) {
  return p.logo_url ? (
    <img src={p.logo_url} alt={`${p.name} logo`} width={size} height={size} className="shrink-0 rounded-2xl bg-white object-contain p-1.5" style={{ width: size, height: size }} />
  ) : (
    <span
      className="flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-leaf to-leaf-deep font-extrabold text-ink"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {p.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export const interestLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? id;

export function SponsorCard({ p }: { p: SponsorProfile }) {
  return (
    <Link href={`/sponsors/${p.slug}`} className="group flex gap-3 rounded-[var(--radius-card)] border border-line card-glass p-4 transition hover:border-leaf/60">
      <SponsorAvatar p={p} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-bold group-hover:text-leaf">{p.name}</span>
        </div>
        <div className="text-xs font-semibold text-leaf">{industryLabel(p.industry)}</div>
        {p.tagline && <p className="mt-1 line-clamp-2 text-sm text-muted">{p.tagline}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {(p.city || p.country) && (
            <span className="flex items-center gap-1 text-xs text-muted">
              <MapPin size={12} /> {[p.city, p.country].filter(Boolean).join(", ")}
            </span>
          )}
          {p.interests.slice(0, 3).map((i) => (
            <span key={i} className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted">
              {interestLabel(i)}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
