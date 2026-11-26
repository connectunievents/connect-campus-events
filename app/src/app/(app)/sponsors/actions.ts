"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { slugify } from "@/lib/format";

export type SponsorFormState = { ok?: boolean; error?: string; message?: string };

const s = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" && v.trim() ? v.trim() : null;
};
const url = (v: string | null) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v);

const ProfileSchema = z.object({
  name: z.string().min(2, "Company name is too short").max(120),
  tagline: z.string().max(160, "Tagline is too long (160 max)").nullable(),
  about: z.string().max(4000).nullable(),
  offer: z.string().max(1000).nullable(),
  contact_email: z.string().email("Enter a valid contact email").nullable(),
  website_url: z.string().url("Enter a valid website (https://…)").nullable(),
});

/** Create or update the signed-in user's sponsor profile. */
export async function saveSponsorProfile(_prev: SponsorFormState, f: FormData): Promise<SponsorFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/sponsor-hub");

  const fields = {
    name: s(f, "name") ?? "",
    tagline: s(f, "tagline"),
    about: s(f, "about"),
    offer: s(f, "offer"),
    contact_email: s(f, "contact_email"),
    website_url: url(s(f, "website_url")),
  };
  const check = ProfileSchema.safeParse(fields);
  if (!check.success) return { error: check.error.issues[0].message };

  const row = {
    ...fields,
    industry: s(f, "industry") ?? "other",
    logo_url: s(f, "logo_url"),
    cover_url: s(f, "cover_url"),
    city: s(f, "city"),
    country: s(f, "country"),
    interests: f.getAll("interests").map(String).filter(Boolean),
    budget_range: s(f, "budget_range"),
    contact_phone: s(f, "contact_phone"),
    show_contact: f.get("show_contact") === "on",
    is_published: f.get("is_published") === "on",
  };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("sponsor_profiles").select("id, slug").eq("owner_id", user.id).maybeSingle();

  if (existing) {
    const { error } = await supabase.from("sponsor_profiles").update(row).eq("id", existing.id);
    if (error) return { error: error.message };
    revalidatePath(`/sponsors/${existing.slug}`);
    revalidatePath("/sponsors");
    return { ok: true, message: "Profile saved" };
  }

  // New profile: derive a unique slug from the name.
  const base = slugify(row.name).slice(0, 50) || "sponsor";
  let slug = base;
  for (let n = 2; n < 50; n++) {
    const { count } = await supabase.from("sponsor_profiles").select("id", { count: "exact", head: true }).eq("slug", slug);
    if (!count) break;
    slug = `${base}-${n}`;
  }
  const { error } = await supabase.from("sponsor_profiles").insert({ ...row, slug, owner_id: user.id });
  if (error) return { error: error.code === "23505" ? "You already have a sponsor profile" : error.message };
  revalidatePath("/sponsors");
  redirect(`/sponsors/${slug}?created=1`);
}

export async function deleteSponsorProfile() {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in" };
  const supabase = await createClient();
  const { error } = await supabase.from("sponsor_profiles").delete().eq("owner_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/sponsors");
  redirect("/sponsors");
}

/** Start a conversation between a sponsor and a university (either side may start it). */
export async function startThread(_prev: SponsorFormState, f: FormData): Promise<SponsorFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in" };
  const sponsorId = s(f, "sponsor_id");
  const universityId = s(f, "university_id");
  const subject = s(f, "subject");
  const body = s(f, "body");
  if (!sponsorId || !universityId) return { error: "Choose who you're writing to" };
  if (!subject || subject.length < 3) return { error: "Add a short subject" };
  if (!body) return { error: "Write a message" };

  const supabase = await createClient();
  const { data: thread, error } = await supabase
    .from("sponsor_threads")
    .insert({ sponsor_id: sponsorId, university_id: universityId, event_id: s(f, "event_id"), subject, started_by: user.id })
    .select("id")
    .single();
  if (error) {
    return { error: error.message.includes("row-level security") ? "You can't start this conversation" : error.message };
  }
  const { error: mErr } = await supabase.from("sponsor_messages").insert({ thread_id: thread.id, body, sender_side: "sponsor" });
  if (mErr) return { error: mErr.message };
  revalidatePath("/inbox");
  redirect(`/inbox/${thread.id}`);
}

/** Reply in a thread. sender_side is overwritten by a database trigger from the caller's role. */
export async function sendMessage(threadId: string, _prev: SponsorFormState, f: FormData): Promise<SponsorFormState> {
  const body = s(f, "body");
  if (!body) return { error: "Write a message" };
  const supabase = await createClient();
  const { error } = await supabase.from("sponsor_messages").insert({ thread_id: threadId, body, sender_side: "sponsor" });
  if (error) return { error: error.message.includes("row-level security") ? "You're not part of this conversation" : error.message };
  revalidatePath(`/inbox/${threadId}`);
  revalidatePath("/inbox");
  return { ok: true };
}

export async function setThreadStatus(threadId: string, status: "open" | "closed") {
  const supabase = await createClient();
  const { error } = await supabase.from("sponsor_threads").update({ status }).eq("id", threadId);
  if (error) return { error: error.message };
  revalidatePath(`/inbox/${threadId}`);
  return { ok: true };
}

export async function setSponsorHidden(profileId: string, hidden: boolean) {
  const user = await getCurrentUser();
  if (!user?.isOwner) return { error: "Only platform owners can do this" };
  const supabase = await createClient();
  const { error } = await supabase.from("sponsor_profiles").update({ is_hidden: hidden }).eq("id", profileId);
  if (error) return { error: error.message };
  revalidatePath("/owner/sponsor-profiles");
  revalidatePath("/sponsors");
  return { ok: true };
}
