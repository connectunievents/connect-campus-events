import Link from "next/link";
import Image from "next/image";
import { Search, Sparkles, CalendarDays } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getFollowedIds, listEvents, listSponsors, searchUniversities } from "@/lib/queries";
import { isLiveEvent, nowMs } from "@/lib/format";
import { EventPoster, EventRow } from "@/components/event-card";
import { Rail, SectionHeader, EmptyState, buttonClass } from "@/components/ui";
import { SponsorStrip } from "@/components/sponsor-strip";
import { Wordmark } from "@/components/logo";
import { UniLogo } from "@/components/uni-logo";
import { CATEGORIES } from "@/lib/types";

export const dynamic = "force-dynamic";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default async function HomePage() {
  const user = await getCurrentUser();
  const [followed, allEvents, sponsors, unis] = await Promise.all([
    getFollowedIds(user?.id),
    listEvents({ limit: 60 }),
    listSponsors(),
    searchUniversities(undefined, 12),
  ]);

  const now = nowMs();
  const live = allEvents.filter((e) => isLiveEvent(e, now));
  const upcoming = allEvents.filter((e) => !isLiveEvent(e, now));
  const mine = followed.length ? upcoming.filter((e) => followed.includes(e.university_id)) : [];
  const thisWeek = upcoming.filter((e) => new Date(e.starts_at).getTime() - now < 7 * 86400_000);
  const firstName = user?.fullName?.split(" ")[0];

  return (
    <main className="animate-fade-up">
      <header className="pt-safe flex items-center justify-between px-4 pb-2 pt-3">
        <Wordmark />
        {user ? (
          <Link href="/profile" className="relative h-9 w-9 overflow-hidden rounded-full border border-line bg-surface-2" aria-label="Profile">
            {user.avatarUrl ? (
              <Image src={user.avatarUrl} alt="" fill sizes="36px" className="object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-sm font-bold text-leaf">{(firstName ?? "U")[0]}</span>
            )}
          </Link>
        ) : (
          <Link href="/login" className={buttonClass("outline", "sm")}>
            Sign in
          </Link>
        )}
      </header>

      <section className="px-4 pb-5 pt-3">
        <p className="text-sm text-muted">{greeting()}{firstName ? `, ${firstName}` : ""} 👋</p>
        <h1 className="mt-1 text-[2rem] font-bold leading-[1.1] tracking-tight">
          What&apos;s on <span className="font-display italic text-leaf">on campus</span> today?
        </h1>
        <Link
          href="/explore"
          className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 text-muted transition hover:border-leaf/60"
        >
          <Search size={20} className="text-leaf" />
          <span>Search universities or events</span>
        </Link>
        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
          {CATEGORIES.slice(1).map((c) => (
            <Link
              key={c.id}
              href={`/explore?category=${c.id}`}
              className="shrink-0 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-muted transition hover:border-leaf hover:text-leaf"
            >
              {c.label}
            </Link>
          ))}
        </div>
      </section>

      {live.length > 0 && (
        <section className="mb-7">
          <SectionHeader title="🔴 Happening now" />
          <Rail>
            {live.map((e, i) => (
              <EventPoster key={e.id} e={e} priority={i === 0} />
            ))}
          </Rail>
        </section>
      )}

      {mine.length > 0 && (
        <section className="mb-7">
          <SectionHeader title="From your universities" href="/explore?mine=1" />
          <Rail>
            {mine.slice(0, 10).map((e) => (
              <EventPoster key={e.id} e={e} />
            ))}
          </Rail>
        </section>
      )}

      <section className="mb-7">
        <SectionHeader title="Universities" href="/explore" action="Browse all" />
        <Rail>
          {unis.map((u) => (
            <Link
              key={u.id}
              href={`/u/${u.slug}`}
              className="flex w-24 shrink-0 snap-start flex-col items-center gap-2 text-center"
            >
              <UniLogo uni={u} size={64} />
              <span className="line-clamp-2 text-xs text-muted">{u.name}</span>
            </Link>
          ))}
        </Rail>
      </section>

      <section className="mb-7">
        <SectionHeader title="This week" href="/explore" />
        {thisWeek.length ? (
          <Rail>
            {thisWeek.map((e, i) => (
              <EventPoster key={e.id} e={e} priority={live.length === 0 && i === 0} />
            ))}
          </Rail>
        ) : (
          <EmptyState icon={<CalendarDays />} title="Quiet week" body="No events in the next 7 days yet. Follow universities to hear first." />
        )}
      </section>

      {upcoming.length > thisWeek.length && (
        <section className="mb-7">
          <SectionHeader title="Coming up" />
          <div className="space-y-1 px-2">
            {upcoming
              .filter((e) => !thisWeek.includes(e))
              .slice(0, 10)
              .map((e) => (
                <EventRow key={e.id} e={e} />
              ))}
          </div>
        </section>
      )}

      <div className="mb-6">
        <SponsorStrip sponsors={sponsors} />
      </div>

      {!user && (
        <div className="mx-4 mb-6 rounded-[var(--radius-card)] border border-leaf/30 bg-gradient-to-br from-leaf/15 to-transparent p-5">
          <Sparkles className="text-leaf" />
          <p className="mt-2 text-lg font-bold">Never miss a campus event</p>
          <p className="mt-1 text-sm text-muted">Sign in with Google or Microsoft to follow universities and keep your tickets in one place.</p>
          <Link href="/login" className={`${buttonClass("primary")} mt-4 w-full`}>
            Get started
          </Link>
        </div>
      )}
    </main>
  );
}
