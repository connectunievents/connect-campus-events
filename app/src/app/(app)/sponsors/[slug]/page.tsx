/* eslint-disable @next/next/no-img-element -- cover images come from Supabase Storage or any URL */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, Globe, Mail, MapPin, MessageSquare, Pencil, Phone, Wallet, Gift, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getSponsorContact, getStaffUniversities } from "@/lib/sponsors";
import { SponsorAvatar, interestLabel } from "@/components/sponsor-card";
import { StartThreadForm } from "@/components/start-thread-form";
import { buttonClass } from "@/components/ui";
import { SPONSOR_PROFILE_SELECT, industryLabel, isSponsorLive, type SponsorProfile } from "@/lib/types";
import { nowMs } from "@/lib/format";

async function load(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("sponsor_profiles").select(SPONSOR_PROFILE_SELECT).eq("slug", slug).maybeSingle();
  return data as SponsorProfile | null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = await load((await params).slug);
  return p ? { title: p.name, description: p.tagline ?? undefined } : {};
}

export default async function SponsorProfilePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ created?: string }> }) {
  const { slug } = await params;
  const { created } = await searchParams;
  const p = await load(slug);
  if (!p) notFound();

  const user = await getCurrentUser();
  const viewer = user;
  const live = isSponsorLive(p, nowMs());
  const isMine = user?.id === p.owner_id;
  const [contact, staffUnis] = await Promise.all([getSponsorContact(p.id), user && !isMine ? getStaffUniversities() : Promise.resolve([])]);

  return (
    <main className="animate-fade-up pb-10">
      <div className="relative h-40 w-full overflow-hidden">
        {p.cover_url ? (
          <img src={p.cover_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgb(82_212_131/0.35),transparent_60%),linear-gradient(135deg,#16542f,#07130c)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-base to-transparent" />
        <Link href="/sponsors" className="top-safe glass absolute left-3 rounded-full p-2.5" aria-label="Back to sponsors">
          <ArrowLeft size={20} />
        </Link>
      </div>

      <section className="relative -mt-10 px-4">
        {created && (
          <p className="mb-4 rounded-xl border border-leaf/40 bg-leaf/10 p-3 text-sm">
            Profile saved. Next, <Link href="/sponsor-hub" className="font-semibold text-leaf">verify your business</Link> to get listed.
          </p>
        )}
        {(isMine || viewer?.isOwner) && !live && (
          <p className="mb-4 flex items-center gap-2 rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm text-warn">
            <EyeOff size={16} />
            {p.is_hidden
              ? "Hidden by the Connect team — only you can see it."
              : p.verification_status !== "approved"
                ? "Not public yet: the business must be verified first."
                : "Not public: no active listing package."}
            {isMine && (
              <Link href="/sponsor-hub" className="ml-auto shrink-0 font-semibold underline">Fix</Link>
            )}
          </p>
        )}
        <div className="flex items-end justify-between gap-3">
          <div className="rounded-3xl border-4 border-base bg-base">
            <SponsorAvatar p={p} size={80} />
          </div>
          {isMine && (
            <Link href="/sponsor-hub" className={buttonClass("outline", "sm")}>
              <Pencil size={14} /> Edit profile
            </Link>
          )}
        </div>
        <h1 className="mt-3 flex items-center gap-2 text-2xl font-bold leading-tight">
          {p.name}
          {p.verification_status === "approved" && (
            <BadgeCheck size={22} className="shrink-0 text-leaf" aria-label="Verified business" />
          )}
        </h1>
        {p.verification_status === "approved" && <p className="text-xs font-semibold text-leaf">Verified business</p>}
        <p className="text-sm font-semibold text-leaf">{industryLabel(p.industry)}</p>
        {p.tagline && <p className="mt-2 text-muted">{p.tagline}</p>}

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          {(p.city || p.country) && (
            <span className="flex items-center gap-1"><MapPin size={14} /> {[p.city, p.country].filter(Boolean).join(", ")}</span>
          )}
          {p.website_url && (
            <a href={p.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-leaf"><Globe size={14} /> Website</a>
          )}
          {contact?.contact_email && (
            <a href={`mailto:${contact.contact_email}`} className="flex items-center gap-1 hover:text-leaf"><Mail size={14} /> {contact.contact_email}</a>
          )}
          {contact?.contact_phone && (
            <a href={`tel:${contact.contact_phone}`} className="flex items-center gap-1 hover:text-leaf"><Phone size={14} /> {contact.contact_phone}</a>
          )}
        </div>
      </section>

      {p.interests.length > 0 && (
        <section className="mt-6 px-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted">Interested in sponsoring</h2>
          <div className="flex flex-wrap gap-2">
            {p.interests.map((i) => (
              <span key={i} className="rounded-full border border-leaf/40 bg-leaf/10 px-3 py-1 text-sm font-semibold text-leaf">{interestLabel(i)}</span>
            ))}
          </div>
        </section>
      )}

      {(p.offer || p.budget_range) && (
        <section className="mx-4 mt-6 grid gap-3 sm:grid-cols-2">
          {p.offer && (
            <div className="rounded-2xl border border-line card-glass p-4 sm:col-span-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted"><Gift size={16} className="text-leaf" /> What we can offer</div>
              <p className="mt-1 whitespace-pre-line">{p.offer}</p>
            </div>
          )}
          {p.budget_range && (
            <div className="rounded-2xl border border-line card-glass p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted"><Wallet size={16} className="text-leaf" /> Typical budget</div>
              <p className="mt-1 font-semibold">{p.budget_range}</p>
            </div>
          )}
        </section>
      )}

      {p.about && (
        <section className="mt-6 px-4">
          <h2 className="mb-2 text-lg font-bold">About</h2>
          <p className="whitespace-pre-line leading-relaxed text-text/85">{p.about}</p>
        </section>
      )}

      <section id="contact" className="mx-4 mt-8 rounded-[var(--radius-card)] border border-line card-glass p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold"><MessageSquare size={20} className="text-leaf" /> Collaborate with {p.name}</h2>
        {isMine ? (
          <p className="mt-2 text-sm text-muted">
            This is your profile. Messages from universities arrive in your <Link href="/inbox" className="font-semibold text-leaf">inbox</Link>. You can also propose a
            sponsorship from any university&apos;s page.
          </p>
        ) : !live ? (
          <p className="mt-2 text-sm text-muted">This sponsor isn&apos;t currently listed, so new conversations are paused.</p>
        ) : !user ? (
          <p className="mt-2 text-sm text-muted">
            <Link href={`/login?next=/sponsors/${p.slug}`} className="font-semibold text-leaf">Sign in</Link> with your university staff account to send {p.name} a message.
          </p>
        ) : staffUnis.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            Messaging is available to university admins and event organizers. Ask your university&apos;s Connect admin to add you to their team
            {contact?.contact_email ? ", or email the sponsor directly." : "."}
          </p>
        ) : (
          <StartThreadForm mode="university" sponsorId={p.id} sponsorName={p.name} universities={staffUnis} />
        )}
      </section>
    </main>
  );
}
