import Image from "next/image";
import Link from "next/link";
import { MapPin, Lock } from "lucide-react";
import type { EventWithUni } from "@/lib/types";
import { fmtDate, fmtMonth, isLiveEvent, priceFrom, remaining, whenLabel } from "@/lib/format";

const FALLBACK = "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=60";

export function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-danger px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
      </span>
      Live
    </span>
  );
}

function Scarcity({ e }: { e: EventWithUni }) {
  const left = remaining(e.ticket_types);
  if (left === null) return null;
  if (left === 0) return <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-muted">Sold out</span>;
  if (left <= 25) return <span className="rounded-full bg-warn/15 px-2 py-0.5 text-[11px] font-semibold text-warn">{left} left</span>;
  return null;
}

/** Large poster card for horizontal rails. */
export function EventPoster({ e, priority = false }: { e: EventWithUni; priority?: boolean }) {
  const live = isLiveEvent(e);
  return (
    <Link
      href={`/e/${e.id}`}
      className="group relative block aspect-[4/5] w-[78vw] max-w-[300px] shrink-0 snap-start overflow-hidden rounded-[var(--radius-card)] border border-line card-glass"
    >
      <Image
        src={e.cover_url || FALLBACK}
        alt=""
        fill
        priority={priority}
        sizes="300px"
        className="object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
      <div className="absolute left-3 right-3 top-3 flex items-start justify-between">
        {live ? <LiveBadge /> : (
          <div className="rounded-xl bg-ink/70 px-2.5 py-1.5 text-center backdrop-blur">
            <div className="text-[10px] font-bold leading-none text-leaf">{fmtMonth(e.starts_at)}</div>
            <div className="text-lg font-bold leading-tight">{fmtDate(e.starts_at)}</div>
          </div>
        )}
        <span
          className="rounded-full px-2.5 py-1 text-[11px] font-bold text-white"
          style={{ background: e.universities?.brand_color ?? "#16542F" }}
        >
          {e.universities?.short_name ?? e.universities?.name}
        </span>
      </div>
      <div className="absolute inset-x-0 bottom-0 p-4">
        <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-leaf">
          {whenLabel(e)}
          {e.visibility === "students" && <Lock size={12} className="text-muted" />}
        </div>
        <h3 className="text-xl font-bold leading-tight">{e.title}</h3>
        <div className="mt-2 flex items-center justify-between gap-2 text-sm text-muted">
          <span className="flex min-w-0 items-center gap-1 truncate">
            <MapPin size={14} className="shrink-0" /> {e.venue ?? e.campus ?? "On campus"}
          </span>
          <span className="flex items-center gap-2">
            <Scarcity e={e} />
            <span className="font-semibold text-text">{priceFrom(e.ticket_types)}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

/** Compact list row. */
export function EventRow({ e }: { e: EventWithUni }) {
  const live = isLiveEvent(e);
  return (
    <Link href={`/e/${e.id}`} className="flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-surface active:bg-surface-2">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface">
        <Image src={e.cover_url || FALLBACK} alt="" fill sizes="80px" className="object-cover" />
        {live && <span className="absolute left-1 top-1"><LiveBadge /></span>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-leaf">
          {whenLabel(e)}
        </div>
        <div className="truncate font-semibold">{e.title}</div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
          <span className="truncate">{e.universities?.short_name ?? e.universities?.name} · {e.venue ?? "Campus"}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 text-sm">
        <span className="font-semibold">{priceFrom(e.ticket_types)}</span>
        <Scarcity e={e} />
      </div>
    </Link>
  );
}
