import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parsePayload, verifyOtp } from "@/lib/rolling-code";

const Body = z.object({ eventId: z.string().uuid(), raw: z.string().min(1).max(300) });

export type ScanResponse = {
  result: "admitted" | "already_used" | "invalid" | "wrong_event" | "void" | "expired_code" | "not_today" | "forbidden";
  holder?: string | null;
  ticketType?: string | null;
  checkedInAt?: string | null;
  manual?: boolean;
  stats?: { checkedIn: number; sold: number };
};

/** Loads the event and checks the caller is staff for it (owner, or admin/organizer/scanner of its university). */
async function authorize(eventId: string) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return { error: NextResponse.json({ error: "Sign in" }, { status: 401 }) };

  const admin = createAdminClient();
  const { data: event } = await admin
    .from("events")
    .select("id, university_id, starts_at, ends_at, gate_opens_minutes_before")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return { error: NextResponse.json({ error: "Event not found" }, { status: 404 }) };

  const [{ data: profile }, { data: member }] = await Promise.all([
    admin.from("profiles").select("is_owner").eq("id", uid).maybeSingle(),
    admin.from("university_members").select("role").eq("university_id", event.university_id).eq("user_id", uid).maybeSingle(),
  ]);
  if (!profile?.is_owner && !member) return { error: NextResponse.json<ScanResponse>({ result: "forbidden" }, { status: 403 }) };
  return { uid, admin, event };
}

async function eventStats(admin: ReturnType<typeof createAdminClient>, eventId: string) {
  const [{ count: checkedIn }, { data: types }] = await Promise.all([
    admin.from("tickets").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "used"),
    admin.from("ticket_types").select("sold").eq("event_id", eventId),
  ]);
  return { checkedIn: checkedIn ?? 0, sold: (types ?? []).reduce((s, t) => s + (t.sold as number), 0) };
}

export async function GET(req: Request) {
  const eventId = new URL(req.url).searchParams.get("eventId") ?? "";
  if (!z.string().uuid().safeParse(eventId).success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const auth = await authorize(eventId);
  if ("error" in auth) return auth.error;
  return NextResponse.json({ stats: await eventStats(auth.admin, eventId) });
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { eventId, raw } = parsed.data;

  const auth = await authorize(eventId);
  if ("error" in auth) return auth.error;
  const { uid, admin, event } = auth;
  const stats = () => eventStats(admin, eventId);
  const log = (result: string) =>
    admin.from("check_ins").insert({ event_id: eventId, scanned_by: uid, result, raw: raw.slice(0, 200) });

  const payload = parsePayload(raw);
  if (!payload) {
    await log("invalid");
    return NextResponse.json<ScanResponse>({ result: "invalid", stats: await stats() });
  }

  // Gate window: opens N minutes before start, closes when the event ends (+4h default).
  const now = Date.now();
  const opens = new Date(event.starts_at).getTime() - (event.gate_opens_minutes_before ?? 120) * 60_000;
  const closes = event.ends_at ? new Date(event.ends_at).getTime() : new Date(event.starts_at).getTime() + 4 * 3600_000;
  if (now < opens || now > closes) {
    await log("not_today");
    return NextResponse.json<ScanResponse>({ result: "not_today", stats: await stats() });
  }

  if (payload.otp) {
    const { data: t } = await admin.from("tickets").select("secret, event_id").eq("code", payload.code).maybeSingle();
    if (t && t.event_id === eventId && !(await verifyOtp(t.secret as string, payload.otp))) {
      await log("expired_code");
      return NextResponse.json<ScanResponse>({ result: "expired_code", stats: await stats() });
    }
  }

  const { data, error } = await admin.rpc("check_in_ticket", {
    p_code: payload.code,
    p_event: eventId,
    p_scanner: uid,
    p_raw: payload.otp ? raw : `manual:${raw}`,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const row = (Array.isArray(data) ? data[0] : data) as {
    result: ScanResponse["result"];
    holder_name: string | null;
    ticket_type: string | null;
    checked_in_at: string | null;
  };
  return NextResponse.json<ScanResponse>({
    result: row.result,
    holder: row.holder_name,
    ticketType: row.ticket_type,
    checkedInAt: row.checked_in_at,
    manual: !payload.otp,
    stats: await stats(),
  });
}
