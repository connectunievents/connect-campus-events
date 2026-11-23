"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { slugify } from "@/lib/format";
import type { FormState } from "@/app/admin/actions";

async function requireOwner() {
  const user = await getCurrentUser();
  if (!user?.isOwner) redirect("/");
  return user;
}

const s = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" && v.trim() ? v.trim() : null;
};

export async function createUniversity(_p: FormState, f: FormData): Promise<FormState> {
  await requireOwner();
  const name = s(f, "name");
  if (!name) return { error: "Name is required" };
  const slug = slugify(s(f, "slug") ?? s(f, "short_name") ?? name);
  const domains = (s(f, "email_domains") ?? "").split(/[\s,]+/).map((d) => d.replace(/^@/, "").toLowerCase()).filter(Boolean);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("universities")
    .insert({
      slug,
      name,
      short_name: s(f, "short_name"),
      city: s(f, "city"),
      country: s(f, "country"),
      email_domains: domains,
      brand_color: s(f, "brand_color") ?? "#16542F",
      website_url: s(f, "website_url"),
    })
    .select("id")
    .single();
  if (error) return { error: error.code === "23505" ? "That slug is taken" : error.message };

  const adminEmail = s(f, "admin_email")?.toLowerCase();
  let note = "";
  if (adminEmail) {
    const svc = createAdminClient();
    const { data: p } = await svc.from("profiles").select("id").ilike("email", adminEmail).maybeSingle();
    if (p) await supabase.from("university_members").insert({ university_id: data.id, user_id: p.id, role: "admin" });
    else note = ` — ${adminEmail} hasn't signed in yet; add them from the university's Team tab later.`;
  }
  revalidatePath("/owner");
  return { ok: true, message: `${name} created${note}` };
}

export async function setUniversityActive(id: string, active: boolean) {
  await requireOwner();
  const supabase = await createClient();
  const { error } = await supabase.from("universities").update({ is_active: active }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/owner");
  return { ok: true };
}

export async function updateInquiry(id: string, _p: FormState, f: FormData): Promise<FormState> {
  await requireOwner();
  const supabase = await createClient();
  const { error } = await supabase
    .from("sponsor_inquiries")
    .update({ status: s(f, "status") ?? "new", owner_notes: s(f, "owner_notes") })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/owner/inquiries");
  return { ok: true, message: "Updated" };
}
