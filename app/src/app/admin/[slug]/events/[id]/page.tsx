import Link from "next/link";
import { notFound } from "next/navigation";
import { Copy, Download, ExternalLink, ScanLine, Trash2 } from "lucide-react";
import { requireUniRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deleteEvent, duplicateEvent, saveEvent, setEventStatus, voidTicket } from "@/app/admin/actions";
import { EventForm } from "@/components/admin/event-form";
import { TicketTypesManager } from "@/components/admin/ticket-types";
import { ActionButton } from "@/components/admin/kit";
import { buttonClass } from "@/components/ui";
import { fmtTime, money } from "@/lib/format";
import type { EventRow, TicketType } from "@/lib/types";

export const metadata = { title: "Edit event" };

export default async function AdminEvent({ params, searchParams }: { params: Promise<{ slug: string; id: string }>; searchParams: Promise<{ created?: string }> }) {
  const { slug, id } = await params;
  const sp = await searchParams;
  const { university, role } = await requireUniRole(slug, ["admin", "organizer"]);
  const supabase = await createClient();
  const { data: event } = await supabase.from("events").select("*").eq("id", id).eq("university_id", university.id).maybeSingle();
  if (!event) notFound();
  const e = event as EventRow;

  const [{ data: types }, { data: stats }, { data: tickets }] = await Promise.all([
    supabase.from("ticket_types").select("*").eq("event_id", id).order("sort_order"),
    supabase.from("event_stats").select("*").eq("event_id", id).maybeSingle(),
    supabase
      .from("tickets")
      .select("id, code, holder_name, status, checked_in_at, created_at, ticket_types(name)")
      .eq("event_id", id)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const statusBtn = (s: "draft" | "published" | "cancelled", label: string, cls: string, confirmText?: string) => (
    <ActionButton run={setEventStatus.bind(null, slug, id, s)} className={cls} confirmText={confirmText} success={`Event ${s}`}>
      {label}
    </ActionButton>
  );

  return (
    <main className="space-y-8">
      {sp.created && (
        <p className="rounded-xl border border-leaf/40 bg-leaf/10 p-3 text-sm">
          Draft created with a free “General admission” ticket. Adjust ticket types below, then <b>Publish</b>.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">{e.title}</h2>
          <p className="text-sm capitalize text-muted">Status: <b className={e.status === "published" ? "text-leaf" : e.status === "cancelled" ? "text-danger" : "text-text"}>{e.status}</b></p>
        </div>
        <div className="flex flex-wrap gap-2">
          {e.status !== "published" && statusBtn("published", "Publish", buttonClass("primary", "sm"))}
          {e.status === "published" && statusBtn("draft", "Unpublish", buttonClass("outline", "sm"))}
          {e.status !== "cancelled" && statusBtn("cancelled", "Cancel event", buttonClass("danger", "sm"), "Cancel this event? Ticket holders will see it as cancelled.")}
          <Link href={`/e/${id}`} target="_blank" className={buttonClass("outline", "sm")}><ExternalLink size={14} /> View</Link>
          <Link href={`/scan/${id}`} className={buttonClass("outline", "sm")}><ScanLine size={14} /> Scan</Link>
          <ActionButton run={duplicateEvent.bind(null, slug, id)} className={buttonClass("outline", "sm")}><Copy size={14} /> Duplicate</ActionButton>
          {role === "admin" && (
            <ActionButton run={deleteEvent.bind(null, slug, id)} className={buttonClass("danger", "sm")} confirmText="Delete this event permanently?">
              <Trash2 size={14} />
            </ActionButton>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Sold", `${stats?.sold ?? 0} / ${stats?.capacity ?? 0}`],
          ["Checked in", stats?.checked_in ?? 0],
          ["Check-in rate", stats?.sold ? `${Math.round((stats.checked_in / stats.sold) * 100)}%` : "—"],
          ["Revenue", Number(stats?.revenue_cents ?? 0) ? money(Number(stats?.revenue_cents)) : "$0"],
        ].map(([k, v]) => (
          <div key={k as string} className="rounded-2xl border border-line bg-surface p-4">
            <div className="text-sm text-muted">{k}</div>
            <div className="mt-1 text-2xl font-bold tabular-nums">{v}</div>
          </div>
        ))}
      </div>

      <section>
        <h3 className="mb-3 text-lg font-bold">Ticket types</h3>
        <TicketTypesManager slug={slug} eventId={id} types={(types ?? []) as TicketType[]} />
      </section>

      <section>
        <h3 className="mb-3 text-lg font-bold">Event details</h3>
        <EventForm action={saveEvent.bind(null, slug, id)} event={e} />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold">Attendees ({tickets?.length ?? 0})</h3>
          <a href={`/admin/${slug}/events/${id}/attendees`} className={buttonClass("outline", "sm")}><Download size={14} /> CSV</a>
        </div>
        <div className="max-h-[480px] overflow-auto rounded-2xl border border-line">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-surface text-xs uppercase tracking-wider text-muted">
              <tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Ticket</th><th className="px-4 py-2">Code</th><th className="px-4 py-2">Status</th><th /></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(tickets ?? []).map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-2">{t.holder_name}</td>
                  <td className="px-4 py-2 text-muted">{(t.ticket_types as unknown as { name: string } | null)?.name}</td>
                  <td className="px-4 py-2 font-mono text-xs">{t.code}</td>
                  <td className="px-4 py-2">
                    {t.status === "used" ? <span className="text-leaf">In · {fmtTime(t.checked_in_at!)}</span> : t.status === "void" ? <span className="text-danger">Void</span> : <span className="text-muted">Valid</span>}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {role === "admin" && t.status === "valid" && (
                      <ActionButton run={voidTicket.bind(null, slug, id, t.id)} confirmText="Void this ticket? It will no longer scan." className="text-xs text-danger hover:underline">
                        Void
                      </ActionButton>
                    )}
                  </td>
                </tr>
              ))}
              {!tickets?.length && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-muted">No tickets yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
