"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUniRole, getCurrentUser } from "@/lib/auth";

export type FormState = { ok?: boolean; error?: string; message?: string };

const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" && v.trim() ? v.trim() : null;
};
/** datetime-local values carry no zone; forms send the browser offset in `tz_offset` (minutes, Date#getTimezoneOffset). */
const localToIso = (f: FormData, k: string) => {
  const v = str(f, k);
  if (!v) return null;
  const tz = Number(f.get("tz_offset") ?? 0);
  return new Date(new Date(v + "Z").getTime() + tz * 60_000).toISOString();
};

// ---------------- Events ----------------
const EventSchema = z.object({
  title: z.string().min(3, "Title is too short").max(140),
  starts_at: z.string().min(1, "Start time is required"),
});

export async function saveEvent(slug: string, eventId: string | null, _prev: FormState, f: FormData): Promise<FormState> {
  const { university, user } = await requireUniRole(slug, ["admin", "organizer"]);
  const check = EventSchema.safeParse({ title: str(f, "title") ?? "", starts_at: str(f, "starts_at") ?? "" });
  if (!check.success) return { error: check.error.issues[0].message };

  const row = {
    university_id: university.id,
    title: check.data.title,
    summary: str(f, "summary"),
    description: str(f, "description"),
    category: str(f, "category") ?? "general",
    venue: str(f, "venue"),
    campus: str(f, "campus"),
    starts_at: localToIso(f, "starts_at")!,
    ends_at: localToIso(f, "ends_at"),
    cover_url: str(f, "cover_url"),
    visibility: str(f, "visibility") === "students" ? "students" : "public",
    gate_opens_minutes_before: Number(str(f, "gate_opens_minutes_before") ?? 120),
  };
  if (row.ends_at && row.ends_at <= row.starts_at) return { error: "End time must be after the start time" };

  const supabase = await createClient();
  if (eventId) {
    const { error } = await supabase.from("events").update(row).eq("id", eventId).eq("university_id", university.id);
    if (error) return { error: error.message };
    revalidatePath(`/admin/${slug}/events/${eventId}`);
    return { ok: true, message: "Saved" };
  }
  const { data, error } = await supabase.from("events").insert({ ...row, created_by: user.id, status: "draft" }).select("id").single();
  if (error) return { error: error.message };
  // Every new event starts with a free General ticket the organizer can edit.
  await supabase.from("ticket_types").insert({ event_id: data.id, name: "General admission", price_cents: 0, quantity: 100 });
  redirect(`/admin/${slug}/events/${data.id}?created=1`);
}

export async function setEventStatus(slug: string, eventId: string, status: "draft" | "published" | "cancelled") {
  const { university } = await requireUniRole(slug, ["admin", "organizer"]);
  const supabase = await createClient();
  if (status === "published") {
    const { count } = await supabase.from("ticket_types").select("id", { count: "exact", head: true }).eq("event_id", eventId);
    if (!count) return { error: "Add at least one ticket type before publishing" };
  }
  const { error } = await supabase.from("events").update({ status }).eq("id", eventId).eq("university_id", university.id);
  if (error) return { error: error.message };
  revalidatePath(`/admin/${slug}`, "layout");
  return { ok: true };
}

export async function duplicateEvent(slug: string, eventId: string) {
  const { university, user } = await requireUniRole(slug, ["admin", "organizer"]);
  const supabase = await createClient();
  const { data: e } = await supabase.from("events").select("*, ticket_types(*)").eq("id", eventId).eq("university_id", university.id).single();
  if (!e) return { error: "Not found" };
  const week = 7 * 86400_000;
  const { data: copy, error } = await supabase
    .from("events")
    .insert({
      university_id: university.id,
      created_by: user.id,
      title: `${e.title} (copy)`,
      summary: e.summary,
      description: e.description,
      category: e.category,
      venue: e.venue,
      campus: e.campus,
      cover_url: e.cover_url,
      visibility: e.visibility,
      starts_at: new Date(new Date(e.starts_at).getTime() + week).toISOString(),
      ends_at: e.ends_at ? new Date(new Date(e.ends_at).getTime() + week).toISOString() : null,
      status: "draft",
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  const types = (e.ticket_types as Record<string, unknown>[]).map((t) => ({
    event_id: copy.id,
    name: t.name,
    description: t.description,
    price_cents: t.price_cents,
    currency: t.currency,
    quantity: t.quantity,
    max_per_order: t.max_per_order,
    students_only: t.students_only,
    sort_order: t.sort_order,
  }));
  if (types.length) await supabase.from("ticket_types").insert(types);
  redirect(`/admin/${slug}/events/${copy.id}`);
}

export async function deleteEvent(slug: string, eventId: string) {
  const { university } = await requireUniRole(slug, ["admin"]);
  const supabase = await createClient();
  const { count } = await supabase.from("orders").select("id", { count: "exact", head: true }).eq("event_id", eventId).in("status", ["paid", "free"]);
  if (count) return { error: "This event has tickets sold — cancel it instead of deleting." };
  const { error } = await supabase.from("events").delete().eq("id", eventId).eq("university_id", university.id);
  if (error) return { error: error.message };
  redirect(`/admin/${slug}`);
}

// ---------------- Ticket types ----------------
export async function saveTicketType(slug: string, eventId: string, typeId: string | null, _prev: FormState, f: FormData): Promise<FormState> {
  await requireUniRole(slug, ["admin", "organizer"]);
  const price = Math.round(Number(str(f, "price") ?? 0) * 100);
  const quantity = Number(str(f, "quantity") ?? 0);
  if (!str(f, "name")) return { error: "Name is required" };
  if (!Number.isFinite(price) || price < 0) return { error: "Invalid price" };
  if (price > 0 && price < 50) return { error: "Paid tickets must be at least 0.50" };
  if (!Number.isInteger(quantity) || quantity < 0) return { error: "Invalid quantity" };
  const row = {
    event_id: eventId,
    name: str(f, "name")!,
    description: str(f, "description"),
    price_cents: price,
    currency: (str(f, "currency") ?? "usd").toLowerCase(),
    quantity,
    max_per_order: Math.min(Math.max(Number(str(f, "max_per_order") ?? 4), 1), 20),
    students_only: f.get("students_only") === "on",
    sales_start: localToIso(f, "sales_start"),
    sales_end: localToIso(f, "sales_end"),
  };
  const supabase = await createClient();
  const { error } = typeId
    ? await supabase.from("ticket_types").update(row).eq("id", typeId).eq("event_id", eventId)
    : await supabase.from("ticket_types").insert(row);
  if (error) return { error: error.message.includes("sold") ? "Quantity can't be lower than tickets already sold" : error.message };
  revalidatePath(`/admin/${slug}/events/${eventId}`);
  return { ok: true, message: typeId ? "Ticket updated" : "Ticket type added" };
}

export async function deleteTicketType(slug: string, eventId: string, typeId: string) {
  await requireUniRole(slug, ["admin", "organizer"]);
  const supabase = await createClient();
  const { error } = await supabase.from("ticket_types").delete().eq("id", typeId).eq("event_id", eventId).eq("sold", 0);
  if (error) return { error: "Can't delete a ticket type that has sales" };
  revalidatePath(`/admin/${slug}/events/${eventId}`);
  return { ok: true };
}

// ---------------- Team ----------------
export async function addMember(slug: string, _prev: FormState, f: FormData): Promise<FormState> {
  const { university } = await requireUniRole(slug, ["admin"]);
  const email = str(f, "email")?.toLowerCase();
  const role = str(f, "role");
  if (!email || !["admin", "organizer", "scanner"].includes(role ?? "")) return { error: "Email and role are required" };
  // Looking up a user by email needs the service role; caller is already verified as admin above.
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("id").ilike("email", email).maybeSingle();
  if (!profile) return { error: "No Connect account with that email yet. Ask them to sign in once, then add them." };
  const supabase = await createClient();
  const { error } = await supabase.from("university_members").upsert({ university_id: university.id, user_id: profile.id, role });
  if (error) return { error: error.message };
  revalidatePath(`/admin/${slug}/team`);
  return { ok: true, message: `${email} added as ${role}` };
}

export async function removeMember(slug: string, userId: string) {
  const { university, user } = await requireUniRole(slug, ["admin"]);
  if (userId === user.id) return { error: "You can't remove yourself" };
  const supabase = await createClient();
  const { error } = await supabase.from("university_members").delete().eq("university_id", university.id).eq("user_id", userId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/${slug}/team`);
  return { ok: true };
}

// ---------------- Sponsors (university-scoped or platform-wide) ----------------
async function sponsorScope(slug: string | null) {
  if (slug) {
    const { university } = await requireUniRole(slug, ["admin"]);
    return { universityId: university.id as string | null, path: `/admin/${slug}/sponsors` };
  }
  const user = await getCurrentUser();
  if (!user?.isOwner) redirect("/");
  return { universityId: null, path: "/owner/sponsors" };
}

export async function saveSponsor(slug: string | null, _prev: FormState, f: FormData): Promise<FormState> {
  const { universityId, path } = await sponsorScope(slug);
  const name = str(f, "name");
  const logo = str(f, "logo_url");
  if (!name || !logo) return { error: "Name and logo are required" };
  const supabase = await createClient();
  const { error } = await supabase.from("sponsors").insert({
    university_id: universityId,
    event_id: str(f, "event_id"),
    name,
    logo_url: logo,
    website_url: str(f, "website_url"),
    tagline: str(f, "tagline"),
    tier: str(f, "tier") ?? "partner",
    starts_at: localToIso(f, "starts_at"),
    ends_at: localToIso(f, "ends_at"),
  });
  if (error) return { error: error.message };
  revalidatePath(path);
  return { ok: true, message: "Sponsor added" };
}

export async function toggleSponsor(slug: string | null, id: string, active: boolean) {
  const { path } = await sponsorScope(slug);
  const supabase = await createClient();
  const { error } = await supabase.from("sponsors").update({ is_active: active }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(path);
  return { ok: true };
}

export async function deleteSponsor(slug: string | null, id: string) {
  const { path } = await sponsorScope(slug);
  const supabase = await createClient();
  const { error } = await supabase.from("sponsors").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(path);
  return { ok: true };
}

// ---------------- University settings ----------------
export async function saveUniversity(slug: string, _prev: FormState, f: FormData): Promise<FormState> {
  const { university } = await requireUniRole(slug, ["admin"]);
  const domains = (str(f, "email_domains") ?? "")
    .split(/[\s,]+/)
    .map((d) => d.replace(/^@/, "").toLowerCase())
    .filter(Boolean);
  const supabase = await createClient();
  const { error } = await supabase
    .from("universities")
    .update({
      name: str(f, "name") ?? university.name,
      short_name: str(f, "short_name"),
      city: str(f, "city"),
      country: str(f, "country"),
      website_url: str(f, "website_url"),
      brand_color: str(f, "brand_color"),
      logo_url: str(f, "logo_url"),
      cover_url: str(f, "cover_url"),
      email_domains: domains,
    })
    .eq("id", university.id);
  if (error) return { error: error.message };
  revalidatePath(`/admin/${slug}`, "layout");
  return { ok: true, message: "University profile saved" };
}

// ---------------- Tickets ----------------
export async function voidTicket(slug: string, eventId: string, ticketId: string) {
  const { university } = await requireUniRole(slug, ["admin"]);
  const admin = createAdminClient();
  const { data: ev } = await admin.from("events").select("university_id").eq("id", eventId).maybeSingle();
  if (ev?.university_id !== university.id) return { error: "Not allowed" };
  const { error } = await admin.from("tickets").update({ status: "void" }).eq("id", ticketId).eq("event_id", eventId).eq("status", "valid");
  if (error) return { error: error.message };
  revalidatePath(`/admin/${slug}/events/${eventId}`);
  return { ok: true };
}
