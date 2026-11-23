import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { MemberRole, University } from "@/lib/types";

export interface CurrentUser {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  isOwner: boolean;
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (!sub) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, avatar_url, is_owner")
    .eq("id", sub)
    .maybeSingle();
  return {
    id: sub,
    email: profile?.email ?? (data.claims.email as string | undefined) ?? null,
    fullName: profile?.full_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    isOwner: Boolean(profile?.is_owner),
  };
});

export async function requireUser(next = "/") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export type UniLite = Pick<University, "id" | "slug" | "name" | "short_name" | "brand_color" | "logo_url">;
export type Membership = { role: MemberRole; universities: UniLite };

export const getMemberships = cache(async (): Promise<Membership[]> => {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
  if (user.isOwner) {
    const { data } = await supabase
      .from("universities")
      .select("id, slug, name, short_name, brand_color, logo_url")
      .order("name");
    return (data ?? []).map((u) => ({ role: "admin" as const, universities: u as UniLite }));
  }
  const { data } = await supabase
    .from("university_members")
    .select("role, universities(id, slug, name, short_name, brand_color, logo_url)")
    .eq("user_id", user.id);
  return ((data ?? []) as unknown as Membership[]).filter((m) => m.universities);
});

/** Ensures the current user has one of `roles` at the university with `slug`. */
export async function requireUniRole(slug: string, roles: MemberRole[]) {
  const user = await requireUser(`/admin/${slug}`);
  const memberships = await getMemberships();
  const m = memberships.find((x) => x.universities.slug === slug && roles.includes(x.role));
  if (!m) redirect("/admin?denied=1");
  return { user, role: m.role, university: m.universities };
}
