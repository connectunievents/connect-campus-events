"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export async function toggleFollow(universityId: string, follow: boolean) {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in first" };
  const supabase = await createClient();
  const { error } = follow
    ? await supabase.from("follows").upsert({ user_id: user.id, university_id: universityId })
    : await supabase.from("follows").delete().eq("user_id", user.id).eq("university_id", universityId);
  if (error) return { error: error.message };
  revalidatePath("/");
  return { ok: true };
}

export async function toggleSave(eventId: string, save: boolean) {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in first" };
  const supabase = await createClient();
  const { error } = save
    ? await supabase.from("saved_events").upsert({ user_id: user.id, event_id: eventId })
    : await supabase.from("saved_events").delete().eq("user_id", user.id).eq("event_id", eventId);
  if (error) return { error: error.message };
  return { ok: true };
}
