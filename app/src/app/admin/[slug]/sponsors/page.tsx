import { requireUniRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SponsorManager } from "@/components/admin/sponsor-manager";
import type { Sponsor } from "@/lib/types";
import { isoFromNow } from "@/lib/format";

export const metadata = { title: "Sponsors" };

export default async function UniSponsors({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { university } = await requireUniRole(slug, ["admin"]);
  const supabase = await createClient();
  const [{ data: sponsors }, { data: events }] = await Promise.all([
    supabase.from("sponsors").select("*").eq("university_id", university.id).order("created_at", { ascending: false }),
    supabase.from("events").select("id, title").eq("university_id", university.id).gte("starts_at", isoFromNow(-86400_000)).order("starts_at"),
  ]);
  return (
    <main>
      <p className="mb-4 text-sm text-muted">
        Sponsors added here appear on your university page and your event pages. Platform-wide sponsors are managed by the Connect team.
      </p>
      <SponsorManager slug={slug} sponsors={(sponsors ?? []) as Sponsor[]} events={events ?? []} />
    </main>
  );
}
