import Link from "next/link";
import { SearchX } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getFollowedIds, listEvents, searchUniversities } from "@/lib/queries";
import { EventRow } from "@/components/event-card";
import { EmptyState, PageTitle } from "@/components/ui";
import { SearchBox } from "@/components/search-box";
import { FollowButton } from "@/components/follow-button";
import { UniLogo } from "@/components/uni-logo";
import { CATEGORIES } from "@/lib/types";

export const metadata = { title: "Explore" };

export default async function ExplorePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const category = sp.category ?? "all";
  const user = await getCurrentUser();
  const followed = await getFollowedIds(user?.id);
  const mineOnly = sp.mine === "1" && followed.length > 0;

  const [unis, events] = await Promise.all([
    searchUniversities(q, q ? 20 : 50),
    listEvents({ q, category, universityIds: mineOnly ? followed : undefined, limit: 60 }),
  ]);

  const chip = (id: string, mine = mineOnly) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (id !== "all") p.set("category", id);
    if (mine) p.set("mine", "1");
    return `/explore${p.size ? `?${p}` : ""}`;
  };

  return (
    <main className="animate-fade-up">
      <PageTitle title="Explore" subtitle="Find a university, follow it, and see what's on." />
      <div className="px-4">
        <SearchBox defaultValue={q} />
      </div>

      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-4">
        {followed.length > 0 && (
          <Link
            href={chip(category, !mineOnly)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${mineOnly ? "bg-leaf text-ink" : "border border-line card-glass text-muted"}`}
          >
            ★ Following
          </Link>
        )}
        {CATEGORIES.map((c) => (
          <Link
            key={c.id}
            href={chip(c.id)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
              category === c.id ? "bg-text text-ink" : "border border-line card-glass text-muted hover:text-text"
            }`}
          >
            {c.label}
          </Link>
        ))}
      </div>

      {unis.length > 0 && category === "all" && !mineOnly && (
        <section className="mt-6">
          <h2 className="mb-2 px-4 text-sm font-semibold uppercase tracking-widest text-muted">Universities</h2>
          <ul className="grid divide-y divide-line/60 px-4 sm:grid-cols-2 sm:gap-x-6 sm:divide-y-0 lg:grid-cols-3">
            {unis.map((u) => (
              <li key={u.id} className="flex items-center gap-3 py-3">
                <Link href={`/u/${u.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <UniLogo uni={u} size={48} />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{u.name}</span>
                    <span className="block truncate text-xs text-muted">{[u.city, u.country].filter(Boolean).join(", ")}</span>
                  </span>
                </Link>
                <FollowButton universityId={u.id} initial={followed.includes(u.id)} signedIn={Boolean(user)} compact />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-2 px-4 text-sm font-semibold uppercase tracking-widest text-muted">
          {q ? `Events matching “${q}”` : "Upcoming events"}
        </h2>
        {events.length ? (
          <div className="grid gap-1 px-2 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => (
              <EventRow key={e.id} e={e} />
            ))}
          </div>
        ) : (
          <EmptyState icon={<SearchX />} title="Nothing found" body="Try another search or category." />
        )}
      </section>
    </main>
  );
}
