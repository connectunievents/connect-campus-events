import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Wordmark } from "@/components/logo";
import { AdminTabs } from "@/components/admin/tabs";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/owner");
  if (!user.isOwner) redirect("/");
  return (
    <div className="min-h-dvh">
      <header className="pt-safe sticky top-0 z-30 border-b border-line glass">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/owner"><Wordmark /></Link>
          <nav className="flex gap-1 text-sm font-semibold">
            <Link href="/admin" className="rounded-lg px-3 py-1.5 text-muted hover:bg-surface-2 hover:text-text">Uni consoles</Link>
            <Link href="/" className="rounded-lg px-3 py-1.5 text-muted hover:bg-surface-2 hover:text-text">Open app</Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="text-2xl font-bold">Owner console</h1>
        <p className="mb-4 text-sm text-muted">Onboard universities and close sponsor deals.</p>
        <AdminTabs
          tabs={[
            { href: "/owner", label: "Universities" },
            { href: "/owner/inquiries", label: "Sponsor inquiries" },
            { href: "/owner/sponsors", label: "Platform sponsors" },
            { href: "/owner/sponsor-profiles", label: "Sponsor profiles" },
          ]}
        />
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
