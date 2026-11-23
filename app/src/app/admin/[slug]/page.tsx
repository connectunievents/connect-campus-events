import Link from "next/link";
import { CalendarPlus, DollarSign, ScanLine, Ticket, CalendarDays } from "lucide-react";
import { requireUniRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { endOf, fmtDay, fmtTime, money, nowMs } from "@/lib/format";
import { buttonClass, EmptyState } from "@/components/ui";

const STATUS: Record<string, string> = {
  draft: "bg-surface-2 text-muted",
  published: "bg-leaf/15 text-leaf",
  cancelled: "bg-danger/15 text-danger",
};

type EventLite = { id: string; title: string; starts_at: string; ends_at: string | null; status: string };
type Stats = { event_id: string; sold: number; capacity: number; checked_in: number; revenue_cents: number };

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center gap-2 text-sm text-muted">{icon} {label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

function EventsTable({ slug, rows, stats }: { slug: string; rows: EventLite[]; stats: Map<string, Stats> }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface text-xs uppercase tracking-wider text-muted">
          <tr>
            <th className="px-4 py-3">Event</th>
            <th className="hidden px-4 py-3 sm:table-cell">When</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Sold</th>
            <th className="hidden px-4 py-3 text-right sm:table-cell">Checked in</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((e) => {
            const s = stats.get(e.id);
            return (
              <tr key={e.id} className="hover:bg-surface/60">
                <td className="px-4 py-3">
                  <Link href={`/admin/${slug}/events/${e.id}`} className="font-semibold hover:text-leaf">{e.title}</Link>
                  <div className="text-xs text-muted sm:hidden">{fmtDay(e.starts_at)}</div>
                </td>
                <td className="hidden px-4 py-3 text-muted sm:table-cell">{fmtDay(e.starts_at)} · {fmtTime(e.starts_at)}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS[e.status]}`}>{e.status}</span></td>
                <td className="px-4 py-3 text-right tabular-nums">{s?.sold ?? 0}<span className="text-muted">/{s?.capacity ?? 0}</span></td>
                <td className="hidden px-4 py-3 text-right tabular-nums sm:table-cell">{s?.checked_in ?? 0}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function UniEvents({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { university } = await requireUniRole(slug, ["admin", "organizer"]);
  const supabase = await createClient();
  const [{ data: events }, { data: statRows }] = await Promise.all([
    supabase.from("events").select("id, title, starts_at, ends_at, status").eq("university_id", university.id).order("starts_at", { ascending: false }),
    supabase.from("event_stats").select("*").eq("university_id", university.id),
  ]);
  const stats = new Map(((statRows ?? []) as Stats[]).map((s) => [s.event_id, s]));
  const totals = ((statRows ?? []) as Stats[]).reduce(
    (a, s) => ({ sold: a.sold + s.sold, checkedIn: a.checkedIn + s.checked_in, revenue: a.revenue + Number(s.revenue_cents) }),
    { sold: 0, checkedIn: 0, revenue: 0 },
  );
  const now = nowMs();
  const all = (events ?? []) as EventLite[];
  const upcoming = all.filter((e) => endOf(e.starts_at, e.ends_at) >= now).reverse();
  const past = all.filter((e) => endOf(e.starts_at, e.ends_at) < now);

  return (
    <main className="space-y-8">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<CalendarDays size={16} />} label="Upcoming events" value={upcoming.length} />
        <Stat icon={<Ticket size={16} />} label="Tickets issued" value={totals.sold} />
        <Stat icon={<ScanLine size={16} />} label="Checked in" value={totals.checkedIn} />
        <Stat icon={<DollarSign size={16} />} label="Revenue" value={totals.revenue ? money(totals.revenue) : "$0"} />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Upcoming & live</h2>
          <Link href={`/admin/${slug}/events/new`} className={buttonClass("primary", "sm")}>
            <CalendarPlus size={16} /> New event
          </Link>
        </div>
        {upcoming.length ? (
          <EventsTable slug={slug} rows={upcoming} stats={stats} />
        ) : (
          <EmptyState title="No upcoming events" body="Create your first event — it stays a draft until you publish it." />
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">Past</h2>
          <EventsTable slug={slug} rows={past} stats={stats} />
        </section>
      )}
    </main>
  );
}
