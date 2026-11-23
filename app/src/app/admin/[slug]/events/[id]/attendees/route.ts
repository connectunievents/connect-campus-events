import { createClient } from "@/lib/supabase/server";

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // Neutralise spreadsheet formula injection and escape quotes.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  // RLS limits this to staff of the event's university.
  const { data, error } = await supabase
    .from("tickets")
    .select("holder_name, code, status, checked_in_at, created_at, ticket_types(name)")
    .eq("event_id", id)
    .order("created_at");
  if (error) return new Response(error.message, { status: 400 });
  const rows = [["Name", "Ticket type", "Code", "Status", "Checked in at", "Issued at"].map(cell).join(",")];
  for (const t of data ?? []) {
    rows.push(
      [t.holder_name, (t.ticket_types as unknown as { name: string } | null)?.name, t.code, t.status, t.checked_in_at, t.created_at].map(cell).join(","),
    );
  }
  return new Response(rows.join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="attendees-${id.slice(0, 8)}.csv"` },
  });
}
