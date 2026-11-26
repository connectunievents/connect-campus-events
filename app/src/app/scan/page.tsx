import Link from "next/link";
import { ArrowLeft, ChevronRight, ScanLine } from "lucide-react";
import { getMemberships, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fmtDay, fmtTime, isLive, isoFromNow } from "@/lib/format";
import { EmptyState } from "@/components/ui";

export const metadata = { title: "Gate scanner" };

export default async function ScanPicker() {
  await requireUser("/scan");
  const memberships = await getMemberships();
  const uniIds = memberships.map((m) => m.universities.id);
  const supabase = await createClient();
  const { data: events } = uniIds.length
    ? await supabase
        .from("events")
        .select("id, title, starts_at, ends_at, venue, universities(short_name, name, brand_color)")
        .in("university_id", uniIds)
        .eq("status", "published")
        .gte("starts_at", isoFromNow(-24 * 3600_000))
        .lte("starts_at", isoFromNow(14 * 86400_000))
        .order("starts_at")
    : { data: [] };

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4">
      <header className="pt-safe flex items-center gap-3 pb-4 pt-3">
        <Link href="/profile" className="rounded-full bg-surface p-2" aria-label="Back">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Gate scanner</h1>
          <p className="text-sm text-muted">Choose the event you&apos;re checking in.</p>
        </div>
      </header>

      {memberships.length === 0 ? (
        <EmptyState icon={<ScanLine size={32} />} title="No scanner access" body="Ask your university admin to add you to their team as a scanner." />
      ) : !events?.length ? (
        <EmptyState icon={<ScanLine size={32} />} title="No events to scan" body="Published events from the last day and next two weeks appear here." />
      ) : (
        <ul className="space-y-2">
          {events.map((e) => {
            const u = e.universities as unknown as { short_name: string | null; name: string; brand_color: string | null };
            const live = isLive(e.starts_at, e.ends_at);
            return (
              <li key={e.id}>
                <Link href={`/scan/${e.id}`} className="flex items-center gap-3 rounded-2xl border border-line card-glass p-4 transition hover:border-leaf">
                  <span className="h-10 w-1.5 rounded-full" style={{ background: u?.brand_color ?? "#52d483" }} />
                  <span className="flex-1">
                    <span className="block font-semibold">{e.title}</span>
                    <span className="block text-xs text-muted">
                      {u?.short_name ?? u?.name} · {fmtDay(e.starts_at)} {fmtTime(e.starts_at)} · {e.venue}
                    </span>
                  </span>
                  {live && <span className="rounded-full bg-danger px-2 py-0.5 text-[10px] font-bold uppercase">Live</span>}
                  <ChevronRight className="text-muted" size={18} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
