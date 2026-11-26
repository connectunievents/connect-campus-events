"use server";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { SITE_URL } from "@/lib/env";

export type VerifyState = { ok?: boolean; error?: string; message?: string };

const s = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" && v.trim() ? v.trim() : null;
};

async function myProfile() {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in" } as const;
  const supabase = await createClient();
  const { data } = await supabase
    .from("sponsor_profiles")
    .select("id, name, verification_status, legal_name, registration_number, registration_country")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!data) return { error: "Create your sponsor profile first" } as const;
  return { user, supabase, profile: data } as const;
}

/** Step 2a: legal business details. */
export async function saveBusinessDetails(_prev: VerifyState, f: FormData): Promise<VerifyState> {
  const ctx = await myProfile();
  if ("error" in ctx) return { error: ctx.error };
  const legal_name = s(f, "legal_name");
  const registration_number = s(f, "registration_number");
  const registration_country = s(f, "registration_country");
  if (!legal_name || legal_name.length < 2) return { error: "Enter the registered legal name of the business" };
  if (!registration_number || !/^[A-Za-z0-9\-/. ]{3,40}$/.test(registration_number)) {
    return { error: "Enter the commercial registration (CR) or licence number" };
  }
  if (!registration_country) return { error: "Choose the country of registration" };
  const { error } = await ctx.supabase.from("sponsor_profiles").update({ legal_name, registration_number, registration_country }).eq("id", ctx.profile.id);
  if (error) return { error: error.message };
  revalidatePath("/sponsor-hub");
  return {
    ok: true,
    message: ctx.profile.verification_status === "approved" ? "Saved — your business is back in review because its legal details changed" : "Business details saved",
  };
}

/** Step 2b: record a document the browser just uploaded to the private bucket. */
export async function recordDocument(kind: string, filePath: string, fileName: string): Promise<VerifyState> {
  const ctx = await myProfile();
  if ("error" in ctx) return { error: ctx.error };
  if (!["registration", "tax", "other"].includes(kind)) return { error: "Unknown document type" };
  if (!filePath.startsWith(`${ctx.user.id}/`)) return { error: "Invalid upload" };
  const { error } = await ctx.supabase
    .from("sponsor_documents")
    .insert({ profile_id: ctx.profile.id, owner_id: ctx.user.id, kind, file_path: filePath, file_name: fileName.slice(0, 200) });
  if (error) return { error: error.message };
  revalidatePath("/sponsor-hub");
  return { ok: true, message: "Document uploaded" };
}

export async function deleteDocument(id: string): Promise<VerifyState> {
  const ctx = await myProfile();
  if ("error" in ctx) return { error: ctx.error };
  const { data: doc } = await ctx.supabase.from("sponsor_documents").select("file_path").eq("id", id).maybeSingle();
  const { error } = await ctx.supabase.from("sponsor_documents").delete().eq("id", id);
  if (error) return { error: "Documents can't be removed while your business is in review or approved" };
  if (doc?.file_path) await ctx.supabase.storage.from("sponsor-docs").remove([doc.file_path]);
  revalidatePath("/sponsor-hub");
  return { ok: true };
}

/** Step 2c: submit for review. */
export async function submitForReview(): Promise<VerifyState> {
  const ctx = await myProfile();
  if ("error" in ctx) return { error: ctx.error };
  const p = ctx.profile;
  if (!p.legal_name || !p.registration_number || !p.registration_country) return { error: "Fill in and save your business details first" };
  const { count } = await ctx.supabase
    .from("sponsor_documents")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", p.id)
    .eq("kind", "registration");
  if (!count) return { error: "Upload your commercial registration or trade licence" };
  const { error } = await ctx.supabase.from("sponsor_profiles").update({ verification_status: "pending" }).eq("id", p.id);
  if (error) return { error: error.message };

  // Best-effort alert to the platform owners.
  const key = process.env.RESEND_API_KEY;
  const to = process.env.OWNER_NOTIFY_EMAIL;
  if (key && to) {
    try {
      await new Resend(key).emails.send({
        from: process.env.EMAIL_FROM ?? "Connect <onboarding@resend.dev>",
        to: to.split(",").map((x) => x.trim()),
        subject: `Sponsor verification request: ${p.name}`,
        text: `${p.name} (${p.legal_name}, reg. ${p.registration_number}, ${p.registration_country}) submitted documents for review.\n\nReview: ${SITE_URL}/owner/sponsor-profiles`,
      });
    } catch {}
  }
  revalidatePath("/sponsor-hub");
  revalidatePath("/owner/sponsor-profiles");
  return { ok: true, message: "Submitted — we'll review your documents shortly" };
}

/** Owner: approve or reject a business. */
export async function reviewSponsor(profileId: string, _prev: VerifyState, f: FormData): Promise<VerifyState> {
  const user = await getCurrentUser();
  if (!user?.isOwner) return { error: "Only platform owners can review sponsors" };
  const decision = s(f, "decision");
  const notes = s(f, "notes");
  if (decision !== "approved" && decision !== "rejected") return { error: "Choose approve or reject" };
  if (decision === "rejected" && !notes) return { error: "Tell the business why it was rejected" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("sponsor_profiles")
    .update({
      verification_status: decision,
      review_notes: notes,
      verified_at: decision === "approved" ? new Date().toISOString() : null,
      verified_by: decision === "approved" ? user.id : null,
    })
    .eq("id", profileId);
  if (error) return { error: error.message };
  revalidatePath("/owner/sponsor-profiles");
  return { ok: true, message: decision === "approved" ? "Business approved" : "Business rejected" };
}

/** Owner: change a plan's price (in dollars; custom = per day). */
export async function updatePlan(planId: string, _prev: VerifyState, f: FormData): Promise<VerifyState> {
  const user = await getCurrentUser();
  if (!user?.isOwner) return { error: "Only platform owners can change prices" };
  const price = Math.round(Number(s(f, "price") ?? "") * 100);
  if (!Number.isFinite(price) || price < 0) return { error: "Enter a valid price" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("listing_plans")
    .update({ price_cents: price, is_active: f.get("is_active") === "on" })
    .eq("id", planId);
  if (error) return { error: error.message };
  revalidatePath("/owner/sponsor-pricing");
  revalidatePath("/sponsor-hub");
  return { ok: true, message: "Price saved" };
}
