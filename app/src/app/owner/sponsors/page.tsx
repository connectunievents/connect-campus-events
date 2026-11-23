import { createClient } from "@/lib/supabase/server";
import { SponsorManager } from "@/components/admin/sponsor-manager";
import type { Sponsor } from "@/lib/types";

export const metadata = { title: "Platform sponsors" };

export default async function OwnerSponsors() {
  const supabase = await createClient();
  const { data } = await supabase.from("sponsors").select("*").is("university_id", null).order("created_at", { ascending: false });
  return (
    <main>
      <p className="mb-4 text-sm text-muted">Platform-wide sponsors appear on the home feed and on every university and event page.</p>
      <SponsorManager slug={null} sponsors={(data ?? []) as Sponsor[]} />
    </main>
  );
}
