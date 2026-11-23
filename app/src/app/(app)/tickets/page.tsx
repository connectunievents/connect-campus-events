import Image from "next/image";
import Link from "next/link";
import { Ticket as TicketIcon, CheckCircle2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { endOf, fmtDay, fmtTime, nowMs, relativeStart } from "@/lib/format";
import { EmptyState, PageTitle, buttonClass } from "@/components/ui";
import { OrderBanner } from "@/components/order-banner";

export const metadata = { title: "My tickets" };

type Row = {
  id: string;
  code: string;
  status: "valid" | "used" | "void";
  holder_name: string | null;
  event_id: string;
  ticket_types: { name: string } | null;
  events: {
    id: string;
    title: string;
    starts_at: string;
    ends_at: string | null;
    venue: string | null;
    cover_url: string | null;
    universities: { short_name: string | null; name: string; brand_color: string | null } | null;
  } | null;
};

export default async function TicketsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await requireUser("/tickets");
  const supabase = await createClient();
  const { data } = await supabase
    .from("tickets")
    .select("id, code, status, holder_name, event_id, ticket_types(name), events(id, title, starts_at, ends_at, venue, cover_url, universities(short_name, name, brand_color))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const rows = ((data ?? []) as unknown as Row[]).filter((r) => r.events);
  const groups = new Map<string, Row[]>();
  for (const r of rows) groups.set(r.event_id, [...(groups.get(r.event_id) ?? []), r]);
  const now = nowMs();
  const all = [...groups.values()].sort((a, b) => +new Date(a[0].events!.starts_at) - +new Date(b[0].events!.starts_at));
  const upcoming = all.filter((g) => endOf(g[0].events!.starts_at, g[0].events!.ends_at) >= now);
  const past = all.filter((g) => endOf(g[0].events!.starts_at, g[0].events!.ends_at) < now).reverse();

  let pendingOrder = false;
  if (sp.order) {
    const { data: o } = await supabase.from("orders").select("status").eq("id", sp.order).maybeSingle();
    pendingOrder = o?.status === "pending";
  }

  return (
    <main className="animate-fade-up">
      <PageTitle title="Tickets" subtitle="Show the QR code at the campus gate." />
      {sp.order && <OrderBanner pending={pendingOrder} demo={sp.demo === "1"} />}

      {upcoming.length === 0 && past.length === 0 ? (
        <EmptyState icon={<TicketIcon size={32} />} title="No tickets yet" body="When you get a ticket it shows up here — and works offline.">
          <Link href="/explore" className={buttonClass("primary")}>
            Find events
          </Link>
        </EmptyState>
      ) : null}

      <div className="space-y-4 px-4">
        {upcoming.map((g) => (
          <TicketStack key={g[0].event_id} group={g} />
        ))}
      </div>

      {past.length > 0 && (
        <section className="mt-10 px-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">Past</h2>
          <div className="space-y-2 opacity-70">
            {past.map((g) => {
              const e = g[0].events!;
              return (
                <Link key={e.id} href={`/e/${e.id}`} className="flex items-center justify-between rounded-2xl border border-line p-3">
                  <div>
                    <div className="font-semibold">{e.title}</div>
                    <div className="text-xs text-muted">{fmtDay(e.starts_at)} · {g.length} ticket{g.length > 1 ? "s" : ""}</div>
                  </div>
                  {g.some((t) => t.status === "used") && <CheckCircle2 className="text-leaf" size={20} />}
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}

function TicketStack({ group }: { group: Row[] }) {
  const e = group[0].events!;
  const color = e.universities?.brand_color ?? "#16542F";
  const valid = group.filter((t) => t.status === "valid");
  return (
    <Link href={`/tickets/${(valid[0] ?? group[0]).id}`} className="group relative block">
      {group.length > 1 && (
        <>
          <div className="absolute inset-x-4 -bottom-2 h-6 rounded-b-2xl border border-line bg-surface-2/60" />
          {group.length > 2 && <div className="absolute inset-x-8 -bottom-4 h-6 rounded-b-2xl border border-line bg-surface-2/30" />}
        </>
      )}
      <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface transition group-active:scale-[0.99]">
        <div className="relative h-32">
          {e.cover_url && <Image src={e.cover_url} alt="" fill sizes="600px" className="object-cover" />}
          <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${color}ee, ${color}55 60%, transparent)` }} />
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-white/80">{e.universities?.short_name ?? e.universities?.name}</span>
            <span className="text-xl font-bold leading-tight text-white">{e.title}</span>
          </div>
        </div>
        {/* perforation */}
        <div className="relative flex items-center">
          <span className="absolute -left-3 h-6 w-6 rounded-full bg-base" />
          <span className="mx-4 flex-1 border-t-2 border-dashed border-line" />
          <span className="absolute -right-3 h-6 w-6 rounded-full bg-base" />
        </div>
        <div className="flex items-center justify-between p-4">
          <div>
            <div className="text-sm font-semibold text-leaf">{relativeStart(e.starts_at, e.ends_at)}</div>
            <div className="text-sm text-muted">
              {fmtDay(e.starts_at)} · {fmtTime(e.starts_at)} · {e.venue ?? "Campus"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">×{group.length}</div>
            <div className="text-xs text-muted">{group[0].ticket_types?.name}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
