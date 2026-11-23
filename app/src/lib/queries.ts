import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { EVENT_SELECT, type EventWithUni, type Sponsor, type University } from "@/lib/types";

const recentCutoff = () => new Date(Date.now() - 6 * 3600_000).toISOString();

export async function listEvents(opts: {
  universityIds?: string[];
  category?: string;
  q?: string;
  limit?: number;
  from?: string;
} = {}): Promise<EventWithUni[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  let query = supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("status", "published")
    .gte("starts_at", opts.from ?? recentCutoff())
    .order("starts_at", { ascending: true })
    .limit(opts.limit ?? 40);
  if (opts.universityIds) {
    if (opts.universityIds.length === 0) return [];
    query = query.in("university_id", opts.universityIds);
  }
  if (opts.category && opts.category !== "all") query = query.eq("category", opts.category);
  if (opts.q) query = query.ilike("title", `%${opts.q.replace(/[%_]/g, "")}%`);
  const { data } = await query;
  // Drop events that already ended (ended events may still be inside the 6h cutoff).
  const now = Date.now();
  return ((data ?? []) as EventWithUni[]).filter((e) => {
    const end = e.ends_at ? new Date(e.ends_at).getTime() : new Date(e.starts_at).getTime() + 4 * 3600_000;
    return end >= now;
  });
}

export async function searchUniversities(q?: string, limit = 30): Promise<University[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  let query = supabase.from("universities").select("*").eq("is_active", true).order("name").limit(limit);
  if (q) {
    const s = q.replace(/[%_,()]/g, "");
    query = query.or(`name.ilike.%${s}%,short_name.ilike.%${s}%,city.ilike.%${s}%`);
  }
  const { data } = await query;
  return (data ?? []) as University[];
}

export async function getFollowedIds(userId: string | undefined): Promise<string[]> {
  if (!userId || !isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("follows").select("university_id").eq("user_id", userId);
  return (data ?? []).map((r) => r.university_id as string);
}

export async function listSponsors(scope: { universityId?: string; eventId?: string } = {}): Promise<Sponsor[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  let query = supabase.from("sponsors").select("*").eq("is_active", true).order("tier").order("sort_order");
  const ors = ["university_id.is.null"];
  if (scope.universityId) ors.push(`university_id.eq.${scope.universityId}`);
  query = query.or(ors.join(","));
  const { data } = await query;
  const rows = (data ?? []) as Sponsor[];
  const now = Date.now();
  return rows.filter((s) => {
    const r = s as Sponsor & { starts_at?: string | null; ends_at?: string | null };
    if (r.starts_at && new Date(r.starts_at).getTime() > now) return false;
    if (r.ends_at && new Date(r.ends_at).getTime() < now) return false;
    return !s.event_id || s.event_id === scope.eventId;
  });
}
