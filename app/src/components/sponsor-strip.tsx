/* eslint-disable @next/next/no-img-element -- sponsor logos come from arbitrary hosts */
import Link from "next/link";
import type { Sponsor } from "@/lib/types";

export function SponsorStrip({ sponsors, title = "Supported by" }: { sponsors: Sponsor[]; title?: string }) {
  if (sponsors.length === 0) {
    return (
      <div className="mx-4 rounded-2xl border border-dashed border-line p-4 text-center text-sm text-muted">
        Want your brand here?{" "}
        <Link href="/sponsor" className="font-semibold text-leaf">
          Become a sponsor →
        </Link>
      </div>
    );
  }
  // Duplicate for a seamless marquee.
  const loop = [...sponsors, ...sponsors];
  return (
    <section aria-label={title} className="px-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">{title}</p>
      <div className="relative overflow-hidden rounded-2xl border border-line bg-surface py-4 [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
        <div className="flex w-max animate-[marquee_28s_linear_infinite] items-center gap-10 px-5 hover:[animation-play-state:paused]">
          {loop.map((s, i) => (
            <a
              key={`${s.id}-${i}`}
              href={s.website_url ?? "#"}
              target="_blank"
              rel="noopener sponsored"
              className="flex h-10 shrink-0 items-center opacity-80 grayscale transition hover:opacity-100 hover:grayscale-0"
              title={s.tagline ?? s.name}
              aria-hidden={i >= sponsors.length}
              tabIndex={i >= sponsors.length ? -1 : undefined}
            >
              <img src={s.logo_url} alt={s.name} className="max-h-10 max-w-[120px] object-contain" loading="lazy" />
            </a>
          ))}
        </div>
      </div>
      <style>{`@keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </section>
  );
}
