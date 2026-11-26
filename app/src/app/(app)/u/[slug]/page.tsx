import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Globe, MapPin, CalendarX2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getMemberships } from "@/lib/auth";
import { getFollowedIds, listEvents, listSponsors } from "@/lib/queries";
import { isLiveEvent } from "@/lib/format";
import { EventPoster, EventRow } from "@/components/event-card";
import { FollowButton } from "@/components/follow-button";
import { StartThreadForm } from "@/components/start-thread-form";
import { getMySponsorProfile } from "@/lib/sponsors";
import { UniLogo } from "@/components/uni-logo";
import { EmptyState, Rail, SectionHeader, buttonClass } from "@/components/ui";
import { SponsorStrip } from "@/components/sponsor-strip";
import type { University } from "@/lib/types";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("universities").select("name").eq("slug", slug).maybeSingle();
  return { title: data?.name ?? "University" };
}

export default async function UniversityPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ sponsor_event?: string }> }) {
  const { slug } = await params;
  const { sponsor_event } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("universities").select("*").eq("slug", slug).maybeSingle();
  if (!data) notFound();
  const uni = data as University;

  const user = await getCurrentUser();
  const [followed, events, sponsors, memberships, mySponsor] = await Promise.all([
    getFollowedIds(user?.id),
    listEvents({ universityIds: [uni.id], limit: 50 }),
    listSponsors({ universityId: uni.id }),
    getMemberships(),
    getMySponsorProfile(),
  ]);
  const isStaff = memberships.some((m) => m.universities.slug === slug);
  const live = events.filter((e) => isLiveEvent(e));
  const rest = events.filter((e) => !isLiveEvent(e));
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
        <Link href="/explore" className="top-safe glass absolute left-3 rounded-full p-2.5" aria-label="Back">
          <ArrowLeft size={20} />
        </Link>
        {uni.cover_credit && (
          <p className="absolute right-3 top-3 max-w-[60%] rounded-md bg-ink/60 px-2 py-0.5 text-right text-[10px] leading-tight text-white/70 backdrop-blur">
            {uni.cover_credit}
          </p>
        )}
      </div>

      <section className="relative -mt-14 px-4">
        <div className="flex items-end justify-between gap-3">
          <UniLogo uni={uni} size={84} className="ring-4 ring-base" />
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
          <div className="grid gap-1 px-2 sm:grid-cols-2 lg:grid-cols-3">
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

      {mySponsor && !mySponsor.is_hidden && (
        <section id="propose" className="squircle-lg mx-4 mb-8 border border-leaf/30 bg-gradient-to-br from-leaf/10 to-transparent p-5">
          <h2 className="text-lg font-bold">Propose a sponsorship to {uni.short_name ?? uni.name}</h2>
          <p className="mt-1 text-sm text-muted">
            You&apos;re writing as <b className="text-text">{mySponsor.name}</b>. Their events team will reply in your inbox.
          </p>
          <StartThreadForm
            mode="sponsor"
            sponsorId={mySponsor.id}
            sponsorName={mySponsor.name}
            universities={[{ id: uni.id, name: uni.name, events: events.map((e) => ({ id: e.id, title: e.title, starts_at: e.starts_at })) }]}
            defaultEventId={sponsor_event}
          />
        </section>
      )}
    </main>
  );
}
