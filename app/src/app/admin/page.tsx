import Link from "next/link";
import { redirect } from "next/navigation";
import { Crown, ShieldAlert } from "lucide-react";
import { getMemberships, requireUser } from "@/lib/auth";
import { EmptyState } from "@/components/ui";
import { UniLogo } from "@/components/uni-logo";

export const metadata = { title: "Admin" };

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser("/admin");
  const memberships = (await getMemberships()).filter((m) => m.role !== "scanner");
  if (memberships.length === 1 && !user.isOwner && !sp.denied) redirect(`/admin/${memberships[0].universities.slug}`);

  return (
    <main>
      <h1 className="text-3xl font-bold tracking-tight">University consoles</h1>
      <p className="mt-1 text-muted">Pick a university to manage its events, tickets, sponsors and team.</p>
      {sp.denied && (
        <p className="mt-4 flex items-center gap-2 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          <ShieldAlert size={18} /> You don&apos;t have access to that console.
        </p>
      )}
      {user.isOwner && (
        <Link href="/owner" className="mt-6 flex items-center gap-3 rounded-2xl border border-warn/40 bg-warn/10 p-4 font-semibold text-warn">
          <Crown /> Owner console — universities & sponsor deals →
        </Link>
      )}
      {memberships.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No university access yet" body="The Connect team adds the first admin for each university. Admins can then invite organizers and scanners." />
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {memberships.map((m) => (
            <Link
              key={m.universities.id}
              href={`/admin/${m.universities.slug}`}
              className="group flex items-center gap-3 rounded-2xl border border-line card-glass p-4 transition hover:border-leaf"
            >
              <UniLogo uni={m.universities} size={48} />
              <span>
                <span className="block font-semibold group-hover:text-leaf">{m.universities.name}</span>
                <span className="block text-xs capitalize text-muted">{m.role}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
