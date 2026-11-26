import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ActionButton } from "@/components/admin/kit";
import { SponsorAvatar } from "@/components/sponsor-card";
import { setSponsorHidden } from "@/app/(app)/sponsors/actions";
import { SPONSOR_PROFILE_SELECT, industryLabel, type SponsorProfile } from "@/lib/types";
import { fmtDay } from "@/lib/format";

export const metadata = { title: "Sponsor profiles" };

export default async function OwnerSponsorProfiles() {
  const supabase = await createClient();
  const { data } = await supabase.from("sponsor_profiles").select(SPONSOR_PROFILE_SELECT).order("created_at", { ascending: false });
  const rows = (data ?? []) as SponsorProfile[];
  return (
    <main>
      <p className="mb-4 text-sm text-muted">
        Self-serve profiles in the public <Link href="/sponsors" className="text-leaf">sponsors directory</Link>. Hide anything spammy or inappropriate; the
        owner still sees it but nobody else does.
      </p>
      {rows.length === 0 && <p className="rounded-2xl border border-dashed border-line p-6 text-center text-muted">No sponsor profiles yet.</p>}
      <div className="space-y-2">
        {rows.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-line card-glass p-3">
            <SponsorAvatar p={p} size={44} />
            <div className="min-w-0 flex-1">
              <Link href={`/sponsors/${p.slug}`} className="font-semibold hover:text-leaf">{p.name}</Link>
              <div className="text-xs text-muted">
                {industryLabel(p.industry)} · joined {fmtDay(p.created_at)}
                {!p.is_published && " · unpublished by owner"}
              </div>
            </div>
            <ActionButton
              run={setSponsorHidden.bind(null, p.id, !p.is_hidden)}
              confirmText={p.is_hidden ? undefined : `Hide ${p.name} from the directory?`}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${p.is_hidden ? "bg-danger/15 text-danger" : "bg-leaf/15 text-leaf"}`}
            >
              {p.is_hidden ? "Hidden — unhide" : "Visible — hide"}
            </ActionButton>
          </div>
        ))}
      </div>
    </main>
  );
}
