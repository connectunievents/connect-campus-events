import Image from "next/image";
import Link from "next/link";
import { Building2, ChevronRight, Crown, Handshake, Inbox, LogOut, ScanLine, ShieldCheck, Store } from "lucide-react";
import { getMemberships, requireUser } from "@/lib/auth";
import { getMySponsorProfile, getUnreadCount } from "@/lib/sponsors";
import { createClient } from "@/lib/supabase/server";
import { PageTitle } from "@/components/ui";

export const metadata = { title: "Profile" };

function Row({ href, icon, title, sub }: { href: string; icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-surface-2">
      <span className="rounded-xl bg-leaf/12 p-2 text-leaf">{icon}</span>
      <span className="flex-1">
        <span className="block font-semibold">{title}</span>
        {sub && <span className="block text-xs text-muted">{sub}</span>}
      </span>
      <ChevronRight size={18} className="text-muted" />
    </Link>
  );
}

export default async function ProfilePage() {
  const user = await requireUser("/profile");
  const [memberships, mySponsor, unread] = await Promise.all([getMemberships(), getMySponsorProfile(), getUnreadCount()]);
  const supabase = await createClient();
  const { data: follows } = await supabase
    .from("follows")
    .select("universities(slug, name, short_name, brand_color)")
    .eq("user_id", user.id);
  const followed = (follows ?? []).map((f) => f.universities as unknown as { slug: string; name: string; short_name: string | null; brand_color: string | null });
  const canScan = memberships.length > 0;
  const canAdmin = memberships.some((m) => m.role === "admin" || m.role === "organizer");

  return (
    <main className="animate-fade-up">
      <PageTitle title="Profile" />
      <section className="mx-4 flex items-center gap-4 rounded-[var(--radius-card)] border border-line card-glass p-4">
        <div className="relative h-16 w-16 overflow-hidden rounded-full bg-surface-2">
          {user.avatarUrl ? (
            <Image src={user.avatarUrl} alt="" fill sizes="64px" className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-leaf">{(user.fullName ?? "U")[0]}</span>
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-lg font-bold">{user.fullName ?? "Student"}</div>
          <div className="truncate text-sm text-muted">{user.email}</div>
          {user.isOwner && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-warn/15 px-2 py-0.5 text-xs font-semibold text-warn">
              <Crown size={12} /> Platform owner
            </span>
          )}
        </div>
      </section>

      {(canScan || canAdmin || user.isOwner) && (
        <section className="mx-4 mt-6 overflow-hidden rounded-[var(--radius-card)] border border-line card-glass">
          <p className="px-4 pt-3 text-xs font-semibold uppercase tracking-widest text-muted">Staff tools</p>
          {canScan && <Row href="/scan" icon={<ScanLine size={20} />} title="Gate scanner" sub="Scan tickets at the entrance" />}
          {canAdmin && <Row href="/admin" icon={<ShieldCheck size={20} />} title="University admin" sub="Events, tickets, sponsors, team" />}
          {user.isOwner && <Row href="/owner" icon={<Crown size={20} />} title="Owner console" sub="Universities & sponsor deals" />}
        </section>
      )}

      <section className="mx-4 mt-6 overflow-hidden rounded-[var(--radius-card)] border border-line card-glass">
        <p className="px-4 pt-3 text-xs font-semibold uppercase tracking-widest text-muted">Following</p>
        {followed.length ? (
          followed.map((u) => (
            <Row key={u.slug} href={`/u/${u.slug}`} icon={<Building2 size={20} />} title={u.name} />
          ))
        ) : (
          <Row href="/explore" icon={<Building2 size={20} />} title="Follow a university" sub="See their events first" />
        )}
      </section>

      <section className="mx-4 mt-6 overflow-hidden rounded-[var(--radius-card)] border border-line card-glass">
        <Row href="/inbox" icon={<Inbox size={20} />} title={`Inbox${unread ? ` · ${unread} new` : ""}`} sub="Sponsorship conversations" />
        <Row href="/sponsors" icon={<Store size={20} />} title="Sponsors directory" sub="Companies that back campus events" />
        <Row
          href="/sponsor-hub"
          icon={<Handshake size={20} />}
          title={mySponsor ? "My sponsor profile" : "Become a sponsor"}
          sub={mySponsor ? mySponsor.name : "Create a free public profile for your company"}
        />
      </section>

      <form action="/auth/signout" method="post" className="mx-4 mt-6">
        <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-line py-3 font-semibold text-danger hover:bg-danger/10">
          <LogOut size={18} /> Sign out
        </button>
      </form>
    </main>
  );
}
