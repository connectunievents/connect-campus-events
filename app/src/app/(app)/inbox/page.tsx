import Link from "next/link";
import { Inbox as InboxIcon } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMySponsorProfile } from "@/lib/sponsors";
import { fmtDay, fmtTime, nowMs } from "@/lib/format";
import { SponsorAvatar } from "@/components/sponsor-card";
import { EmptyState, PageTitle, buttonClass } from "@/components/ui";

export const metadata = { title: "Inbox" };

type Row = {
  id: string;
  subject: string;
  status: string;
  last_message_at: string;
  sponsor_profiles: { name: string; logo_url: string | null; owner_id: string } | null;
  universities: { name: string; short_name: string | null } | null;
  events: { title: string } | null;
};

export default async function InboxPage() {
  const user = await requireUser("/inbox");
  const supabase = await createClient();
  const [{ data }, { data: reads }, mine] = await Promise.all([
    supabase
      .from("sponsor_threads")
      .select("id, subject, status, last_message_at, sponsor_profiles(name, logo_url, owner_id), universities(name, short_name), events(title)")
      .order("last_message_at", { ascending: false })
      .limit(200),
    supabase.from("sponsor_thread_reads").select("thread_id, read_at").eq("user_id", user.id),
    getMySponsorProfile(),
  ]);
  const readAt = new Map((reads ?? []).map((r) => [r.thread_id as string, new Date(r.read_at as string).getTime()]));
  const threads = (data ?? []) as unknown as Row[];
  const now = nowMs();

  return (
    <main className="animate-fade-up">
      <PageTitle title="Inbox" subtitle="Conversations between sponsors and universities." />
      {threads.length === 0 ? (
        <EmptyState icon={<InboxIcon size={32} />} title="No conversations yet" body={mine ? "When a university writes to you it shows up here. You can also propose a sponsorship from any university page." : "Find a sponsor in the directory and send them a message."}>
          <Link href="/sponsors" className={buttonClass("primary", "sm")}>Browse sponsors</Link>
        </EmptyState>
      ) : (
        <ul className="space-y-2 px-4">
          {threads.map((t) => {
            const unread = !readAt.has(t.id) || new Date(t.last_message_at).getTime() > readAt.get(t.id)!;
            const iAmSponsor = t.sponsor_profiles?.owner_id === user.id;
            const counterpart = iAmSponsor ? t.universities?.name : t.sponsor_profiles?.name;
            return (
              <li key={t.id}>
                <Link href={`/inbox/${t.id}`} className="squircle flex items-center gap-3 border border-line card-glass p-3 transition hover:border-leaf/60">
                  {t.sponsor_profiles && <SponsorAvatar p={t.sponsor_profiles} size={44} />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`truncate ${unread ? "font-bold" : "font-semibold"}`}>{counterpart}</span>
                      {t.status === "closed" && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold uppercase text-muted">Closed</span>}
                    </div>
                    <div className={`truncate text-sm ${unread ? "text-text" : "text-muted"}`}>{t.subject}</div>
                    {t.events && <div className="truncate text-xs text-leaf">{t.events.title}</div>}
                  </div>
                  <div className="flex flex-col items-end gap-1 text-xs text-muted">
                    <span>{now - new Date(t.last_message_at).getTime() < 86400_000 ? fmtTime(t.last_message_at) : fmtDay(t.last_message_at)}</span>
                    {unread && <span className="h-2.5 w-2.5 rounded-full bg-leaf" aria-label="Unread" />}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
