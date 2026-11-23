import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Globe, MapPin, CalendarX2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getMemberships } from "@/lib/auth";
import { getFollowedIds, listEvents, listSponsors } from "@/lib/queries";
import { isLive } from "@/lib/format";
import { EventPoster, EventRow } from "@/components/event-card";
import { FollowButton } from "@/components/follow-button";
import { EmptyState, Rail, SectionHeader, buttonClass } from "@/components/ui";
import { SponsorStrip } from "@/components/sponsor-strip";
import type { University } from "@/lib/types";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("universities").select("name").eq("slug", slug).maybeSingle();
  return { title: data?.name ?? "University" };
}

export default async function UniversityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("universities").select("*").eq("slug", slug).maybeSingle();
  if (!data) notFound();
  const uni = data as University;

  const user = await getCurrentUser();
  const [followed, events, sponsors, memberships] = await Promise.all([
    getFollowedIds(user?.id),
    listEvents({ universityIds: [uni.id], limit: 50 }),
    listSponsors({ universityId: uni.id }),
    getMemberships(),
  ]);
  const isStaff = memberships.some((m) => m.universities.slug === slug);
  const live = events.filter((e) => isLive(e.starts_at, e.ends_at));
  const rest = events.filter((e) => !isLive(e.starts_at, e.ends_at));
  const color = uni.brand_color ?? "#16542F";

  return (
    <main className="animate-fade-up">
      <div className="relative h-56 w-full overflow-hidden">
        {uni.cover_url ? (
          <Image src={uni.cover_url} alt="" fill priority sizes="100vw" className="object-cover" />
        ) : (
          <div className="h-full w-full" style={{ background: `linear-gradient(135deg, ${color}, #07130c)` }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-base via-base/50 to-transparent" />
        <Link href="/explore" className="pt-safe absolute left-3 top-3 rounded-full bg-ink/60 p-2 backdrop-blur" aria-label="Back">
          <ArrowLeft size={20} />
        </Link>
      </div>

      <section className="relative -mt-14 px-4">
        <div className="flex items-end justify-between gap-3">
          <span
            className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-base text-lg font-extrabold text-white shadow-xl"
            style={{ background: `linear-gradient(145deg, ${color}, #07130c)` }}
          >
            {uni.short_name ?? uni.name.slice(0, 3)}
          </span>
          <FollowButton universityId={uni.id} initial={followed.includes(uni.id)} signedIn={Boolean(user)} />
        </div>
        <h1 className="mt-3 text-2xl font-bold leading-tight">{uni.name}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          {uni.city && (
            <span className="flex items-center gap-1">
              <MapPin size={14} /> {[uni.city, uni.country].filter(Boolean).join(", ")}
            </span>
          )}
          {uni.website_url && (
            <a href={uni.website_url} target="_blank" rel="noopener" className="flex items-center gap-1 hover:text-leaf">
              <Globe size={14} /> Website
            </a>
          )}
        </div>
        {isStaff && (
          <Link href={`/admin/${uni.slug}`} className={`${buttonClass("outline", "sm")} mt-3`}>
            Open admin console
          </Link>
        )}
      </section>

      {live.length > 0 && (
        <section className="mt-7">
          <SectionHeader title="🔴 Happening now" />
          <Rail>
            {live.map((e) => (
              <EventPoster key={e.id} e={e} />
            ))}
          </Rail>
        </section>
      )}

      <section className="mt-7">
        <SectionHeader title="Upcoming events" />
        {rest.length ? (
          <div className="space-y-1 px-2">
            {rest.map((e) => (
              <EventRow key={e.id} e={e} />
            ))}
          </div>
        ) : (
          <EmptyState icon={<CalendarX2 />} title="No upcoming events" body="Follow this university and we'll show their next events on your home feed." />
        )}
      </section>

      <div className="my-8">
        <SponsorStrip sponsors={sponsors} title={`${uni.short_name ?? "Campus"} partners`} />
      </div>
    </main>
  );
}
