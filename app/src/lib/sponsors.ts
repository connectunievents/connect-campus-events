import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getMemberships } from "@/lib/auth";
import { isoFromNow } from "@/lib/format";
import { SPONSOR_PRIVATE_SELECT, type SponsorPrivate } from "@/lib/types";

export async function getMySponsorProfile(): Promise<SponsorPrivate | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("sponsor_profiles").select(SPONSOR_PRIVATE_SELECT).eq("owner_id", user.id).maybeSingle();
  return (data as SponsorPrivate | null) ?? null;
}

export async function getSponsorContact(profileId: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("sponsor_contact", { p: profileId });
  const row = (Array.isArray(data) ? data[0] : data) as { contact_email: string | null; contact_phone: string | null } | undefined;
  return row ?? null;
}

/** Universities the current user can speak for (admin/organizer), with their upcoming events. */
export async function getStaffUniversities() {
  const memberships = (await getMemberships()).filter((m) => m.role === "admin" || m.role === "organizer");
  if (memberships.length === 0) return [];
  const supabase = await createClient();
  const ids = memberships.map((m) => m.universities.id);
  const { data: events } = await supabase
    .from("events")
    .select("id, title, starts_at, university_id")
    .in("university_id", ids)
    .neq("status", "cancelled")
    .gte("starts_at", isoFromNow(-86400_000))
    .order("starts_at")
    .limit(200);
  return memberships.map((m) => ({
    id: m.universities.id,
    name: m.universities.name,
    events: (events ?? []).filter((e) => e.university_id === m.universities.id).map((e) => ({ id: e.id, title: e.title, starts_at: e.starts_at })),
  }));
}

/** Count of threads with messages the user hasn't seen. */
export async function getUnreadCount(): Promise<number> {
  const user = await getCurrentUser();
  if (!user) return 0;
  const supabase = await createClient();
  const [{ data: threads }, { data: reads }] = await Promise.all([
    supabase.from("sponsor_threads").select("id, last_message_at").order("last_message_at", { ascending: false }).limit(100),
    supabase.from("sponsor_thread_reads").select("thread_id, read_at").eq("user_id", user.id),
  ]);
  const readAt = new Map((reads ?? []).map((r) => [r.thread_id as string, r.read_at as string]));
  return (threads ?? []).filter((t) => !readAt.has(t.id) || new Date(t.last_message_at) > new Date(readAt.get(t.id)!)).length;
}
