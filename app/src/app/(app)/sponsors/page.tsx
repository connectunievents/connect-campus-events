import Link from "next/link";
import { Handshake, Plus, SearchX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { getMySponsorProfile } from "@/lib/sponsors";
import { SponsorCard } from "@/components/sponsor-card";
import { EmptyState, PageTitle, buttonClass } from "@/components/ui";
import { INDUSTRIES, SPONSOR_PROFILE_SELECT, type SponsorProfile } from "@/lib/types";

export const metadata = { title: "Sponsors directory", description: "Companies that sponsor university events. Browse profiles and reach out to collaborate." };

export default async function SponsorsDirectory({ searchParams }: { searchParams: Promise<{ q?: string; industry?: string }> }) {
  const { q, industry } = await searchParams;
  const mine = await getMySponsorProfile();
  let profiles: SponsorProfile[] = [];
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    let query = supabase
      .from("sponsor_profiles")
      .select(SPONSOR_PROFILE_SELECT)
      .eq("is_published", true)
      .eq("is_hidden", false)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (industry) query = query.eq("industry", industry);
    if (q?.trim()) {
      const term = q.trim().replace(/[%_,()]/g, "");
      query = query.or(`name.ilike.%${term}%,tagline.ilike.%${term}%,about.ilike.%${term}%`);
    }
    const { data } = await query;
    profiles = (data ?? []) as SponsorProfile[];
  }

  const chip = (id?: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (id) p.set("industry", id);
    return `/sponsors${p.size ? `?${p}` : ""}`;
  };

  return (
    <main className="animate-fade-up">
      <PageTitle title="Sponsors" subtitle="Companies ready to back campus events. Universities can message them directly.">
        <Link href="/sponsor-hub" className={buttonClass(mine ? "outline" : "primary", "sm")}>
          {mine ? "My profile" : (<><Plus size={16} /> Join</>)}
        </Link>
      </PageTitle>

      <form action="/sponsors" className="px-4">
        {industry && <input type="hidden" name="industry" value={industry} />}
        <input name="q" defaultValue={q} placeholder="Search sponsors…" className="field" enterKeyHint="search" aria-label="Search sponsors" />
      </form>

      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-4">
        <Link href={chip()} className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold ${!industry ? "bg-text text-ink" : "border border-line card-glass text-muted"}`}>
          All
        </Link>
        {INDUSTRIES.map((i) => (
          <Link
            key={i.id}
            href={chip(i.id)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold ${industry === i.id ? "bg-text text-ink" : "border border-line card-glass text-muted hover:text-text"}`}
          >
            {i.label}
          </Link>
        ))}
      </div>

      <section className="mt-5 grid gap-3 px-4 sm:grid-cols-2 lg:grid-cols-3">
        {profiles.map((p) => (
          <SponsorCard key={p.id} p={p} />
        ))}
      </section>
      {profiles.length === 0 && (
        <div className="mt-4">
          <EmptyState icon={q || industry ? <SearchX /> : <Handshake />} title={q || industry ? "No sponsors match" : "No sponsors yet"} body="Companies can create a free profile in a minute.">
            <Link href="/sponsor-hub" className={buttonClass("primary", "sm")}>Create a sponsor profile</Link>
          </EmptyState>
        </div>
      )}

      {!mine && profiles.length > 0 && (
        <div className="mx-4 mt-8 rounded-[var(--radius-card)] border border-leaf/30 bg-gradient-to-br from-leaf/15 to-transparent p-5">
          <Handshake className="text-leaf" />
          <p className="mt-2 text-lg font-bold">Is your company a sponsor?</p>
          <p className="mt-1 text-sm text-muted">Create a free profile so universities and student clubs can find you and invite you to their events.</p>
          <Link href="/sponsor-hub" className={`${buttonClass("primary")} mt-4 w-full`}>Create your profile</Link>
        </div>
      )}
    </main>
  );
}
