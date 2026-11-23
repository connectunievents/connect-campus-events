import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarPlus, Clock, ExternalLink, Lock, MapPin, Ticket } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { listSponsors } from "@/lib/queries";
import { fmtLongDay, fmtTime, isLiveEvent, nowMs, whenLabel } from "@/lib/format";
import { LiveBadge } from "@/components/event-card";
import { SponsorStrip } from "@/components/sponsor-strip";
import { TicketPicker } from "@/components/ticket-picker";
import { ShareButton } from "@/components/share-button";
import type { EventRow, TicketType, University } from "@/lib/types";

type Full = EventRow & { universities: University; ticket_types: TicketType[] };

async function load(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("events").select("*, universities(*), ticket_types(*)").eq("id", id).maybeSingle();
  return data as Full | null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const e = await load((await params).id);
  return e ? { title: e.title, description: e.summary ?? undefined, openGraph: { images: e.cover_url ? [e.cover_url] : [] } } : {};
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = await load(id);
  if (!e) notFound();
  const user = await getCurrentUser();
  const sponsors = await listSponsors({ universityId: e.university_id, eventId: e.id });
  const supabase = await createClient();
  const { count: myTickets } = user
    ? await supabase.from("tickets").select("id", { count: "exact", head: true }).eq("event_id", e.id).eq("user_id", user.id)
    : { count: 0 };

  const types = [...e.ticket_types].sort((a, b) => a.sort_order - b.sort_order || a.price_cents - b.price_cents);
  const live = isLiveEvent(e);
  const ended = !live && new Date(e.starts_at).getTime() < nowMs();
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([e.venue, e.campus, e.universities.name].filter(Boolean).join(", "))}`;

  return (
    <>
    <main className="animate-fade-up pb-40">
      <div className="relative aspect-[4/3] w-full overflow-hidden md:aspect-[16/8]">
        {e.cover_url ? (
          <Image src={e.cover_url} alt="" fill priority sizes="(max-width: 768px) 100vw, 672px" className="object-cover" />
        ) : (
          <div className="h-full w-full" style={{ background: `linear-gradient(135deg, ${e.universities.brand_color}, #07130c)` }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-base via-transparent to-ink/40" />
        <div className="pt-safe absolute inset-x-3 top-3 flex justify-between">
          <Link href={`/u/${e.universities.slug}`} className="rounded-full bg-ink/60 p-2 backdrop-blur" aria-label="Back">
            <ArrowLeft size={20} />
          </Link>
          <ShareButton title={e.title} />
        </div>
      </div>

      <article className="-mt-8 px-4">
        <div className="relative flex items-center gap-2">
          {live && <LiveBadge />}
          <Link
            href={`/u/${e.universities.slug}`}
            className="rounded-full px-2.5 py-1 text-xs font-bold text-white"
            style={{ background: e.universities.brand_color ?? "#16542F" }}
          >
            {e.universities.short_name ?? e.universities.name}
          </Link>
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold capitalize text-muted">{e.category}</span>
          {e.visibility === "students" && (
            <span className="flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted">
              <Lock size={12} /> Students only
            </span>
          )}
          {e.is_demo && <span className="rounded-full bg-warn/15 px-2.5 py-1 text-xs font-semibold text-warn">Sample event</span>}
        </div>
        <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight">{e.title}</h1>
        {e.summary && <p className="mt-2 text-muted">{e.summary}</p>}
        {e.source_url && (
          <a href={e.source_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-leaf hover:underline">
            <ExternalLink size={14} /> Official listing{e.time_tbc ? " — check start time" : ""}
          </a>
        )}

        {e.status === "cancelled" && (
          <div className="mt-4 rounded-xl border border-danger/40 bg-danger/10 p-3 font-semibold text-danger">This event has been cancelled.</div>
        )}

        <div className="mt-5 space-y-3 rounded-[var(--radius-card)] border border-line bg-surface p-4">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-leaf/12 p-2 text-leaf"><Clock size={20} /></span>
            <div className="flex-1">
              <div className="font-semibold">{fmtLongDay(e.starts_at)}</div>
              <div className="text-sm text-muted">
                {e.time_tbc ? whenLabel(e) : `${fmtTime(e.starts_at)}${e.ends_at ? ` – ${fmtTime(e.ends_at)}` : ""} · ${whenLabel(e).split(" · ")[0]}`}
              </div>
            </div>
            <a href={`/e/${e.id}/ics`} className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-leaf hover:bg-leaf/10">
              <CalendarPlus size={16} /> Add
            </a>
          </div>
          <div className="h-px bg-line" />
          <a href={maps} target="_blank" rel="noopener" className="flex items-start gap-3">
            <span className="rounded-xl bg-leaf/12 p-2 text-leaf"><MapPin size={20} /></span>
            <div className="flex-1">
              <div className="font-semibold">{e.venue ?? "On campus"}</div>
              <div className="text-sm text-muted">{[e.campus, e.universities.name].filter(Boolean).join(" · ")}</div>
            </div>
            <span className="text-sm font-semibold text-leaf">Map</span>
          </a>
        </div>

        {(myTickets ?? 0) > 0 && (
          <Link
            href="/tickets"
            className="mt-4 flex items-center justify-between rounded-[var(--radius-card)] border border-leaf/40 bg-leaf/10 p-4"
          >
            <span className="flex items-center gap-2 font-semibold text-leaf">
              <Ticket size={20} /> You have {myTickets} ticket{myTickets === 1 ? "" : "s"}
            </span>
            <span className="text-sm font-semibold">View →</span>
          </Link>
        )}

        {e.description && (
          <section className="mt-6">
            <h2 className="mb-2 text-lg font-bold">About</h2>
            <p className="whitespace-pre-line leading-relaxed text-text/85">{e.description}</p>
          </section>
        )}
      </article>

      <div className="my-8">
        <SponsorStrip sponsors={sponsors} title="Presented with" />
      </div>
    </main>
    {/* Outside <main>: its entrance animation uses transform, which would trap position:fixed. */}
    <TicketPicker
      eventId={e.id}
      types={types}
      signedIn={Boolean(user)}
      disabled={e.status !== "published" || ended}
      disabledReason={e.status === "cancelled" ? "Cancelled" : ended ? "Event ended" : "Not on sale"}
    />
    </>
  );
}
