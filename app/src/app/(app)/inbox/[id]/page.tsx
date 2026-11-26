import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fmtDay, fmtTime } from "@/lib/format";
import { SponsorAvatar } from "@/components/sponsor-card";
import { ReplyBox } from "@/components/reply-box";
import { ActionButton } from "@/components/admin/kit";
import { setThreadStatus } from "@/app/(app)/sponsors/actions";

export const metadata = { title: "Conversation" };

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/inbox/${id}`);
  const supabase = await createClient();
  const { data: t } = await supabase
    .from("sponsor_threads")
    .select("id, subject, status, sponsor_id, sponsor_profiles(name, slug, logo_url, owner_id), universities(name, slug), events(id, title, starts_at)")
    .eq("id", id)
    .maybeSingle();
  if (!t) notFound();
  const sp = t.sponsor_profiles as unknown as { name: string; slug: string; logo_url: string | null; owner_id: string };
  const uni = t.universities as unknown as { name: string; slug: string };
  const ev = t.events as unknown as { id: string; title: string; starts_at: string } | null;
  const mySide = sp.owner_id === user.id ? "sponsor" : "university";

  const { data: messages } = await supabase
    .from("sponsor_messages")
    .select("id, body, sender_side, created_at, profiles(full_name)")
    .eq("thread_id", id)
    .order("created_at");

  // Mark as read (a plain database write; no cookies involved).
  await supabase.from("sponsor_thread_reads").upsert({ thread_id: id, user_id: user.id, read_at: new Date().toISOString() });

  return (
    <main className="flex min-h-[calc(100dvh-7rem)] flex-col">
      <header className="pt-safe glass sticky top-0 z-20 flex items-center gap-3 border-b border-line px-4 pb-3 pt-3">
        <Link href="/inbox" className="rounded-full bg-surface p-2" aria-label="Back to inbox">
          <ArrowLeft size={20} />
        </Link>
        <SponsorAvatar p={sp} size={40} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold">{mySide === "sponsor" ? uni.name : sp.name}</div>
          <div className="truncate text-xs text-muted">{t.subject}</div>
        </div>
        <ActionButton
          run={setThreadStatus.bind(null, id, t.status === "open" ? "closed" : "open")}
          className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-muted hover:text-text"
        >
          {t.status === "open" ? "Close" : "Reopen"}
        </ActionButton>
      </header>

      <div className="flex flex-wrap gap-2 px-4 pt-3 text-xs">
        <Link href={`/sponsors/${sp.slug}`} className="rounded-full bg-surface-2 px-3 py-1 font-semibold text-muted hover:text-text">Sponsor profile</Link>
        <Link href={`/u/${uni.slug}`} className="rounded-full bg-surface-2 px-3 py-1 font-semibold text-muted hover:text-text">{uni.name}</Link>
        {ev && (
          <Link href={`/e/${ev.id}`} className="flex items-center gap-1 rounded-full bg-leaf/10 px-3 py-1 font-semibold text-leaf">
            <CalendarDays size={12} /> {ev.title} · {fmtDay(ev.starts_at)}
          </Link>
        )}
      </div>

      <ol className="flex-1 space-y-3 px-4 py-4">
        {(messages ?? []).map((m) => {
          const mine = m.sender_side === mySide;
          const who = (m.profiles as unknown as { full_name: string | null } | null)?.full_name;
          return (
            <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`squircle max-w-[85%] px-4 py-2.5 ${mine ? "bg-leaf text-ink" : "border border-line card-glass"}`}>
                <p className="whitespace-pre-line text-[15px] leading-relaxed">{m.body}</p>
                <p className={`mt-1 text-[11px] ${mine ? "text-ink/60" : "text-muted"}`}>
                  {!mine && who ? `${who} · ` : ""}
                  {m.sender_side === "sponsor" ? sp.name : uni.name} · {fmtDay(m.created_at)} {fmtTime(m.created_at)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {t.status === "open" ? (
        <ReplyBox threadId={id} />
      ) : (
        <p className="px-4 pb-6 text-center text-sm text-muted">This conversation is closed. Reopen it to reply.</p>
      )}
    </main>
  );
}
