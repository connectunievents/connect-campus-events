import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-5 pb-16">
      <header className="pt-safe flex items-center gap-3 pb-4 pt-4">
        <Link href="/" className="rounded-full bg-surface p-2" aria-label="Back">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-xs text-muted">Last updated {updated}</p>
        </div>
      </header>
      <article className="space-y-4 leading-relaxed text-text/85 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-text [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_a]:text-leaf">
        {children}
      </article>
    </main>
  );
}
