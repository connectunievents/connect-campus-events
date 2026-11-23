import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/env";

const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: e } = await supabase.from("events").select("id,title,summary,venue,campus,starts_at,ends_at,universities(name)").eq("id", id).maybeSingle();
  if (!e) return new Response("Not found", { status: 404 });
  const uni = (e.universities as unknown as { name: string } | null)?.name ?? "";
  const end = e.ends_at ?? new Date(new Date(e.starts_at).getTime() + 2 * 3600_000).toISOString();
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Connect//Campus Events//EN",
    "BEGIN:VEVENT",
    `UID:${e.id}@connect`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(e.starts_at)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(e.title)}`,
    `DESCRIPTION:${esc((e.summary ?? "") + "\n" + SITE_URL + "/e/" + e.id)}`,
    `LOCATION:${esc([e.venue, e.campus, uni].filter(Boolean).join(", "))}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return new Response(ics, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="event.ics"` },
  });
}
