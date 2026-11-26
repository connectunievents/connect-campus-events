import Link from "next/link";
import { Wordmark } from "@/components/logo";

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="pt-safe sticky top-0 z-30 border-b border-line glass">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/admin">
            <Wordmark />
          </Link>
          <nav className="no-scrollbar -mr-2 flex min-w-0 items-center gap-1 overflow-x-auto text-sm font-semibold [&>a]:shrink-0">
            <Link href="/sponsors" className="rounded-lg px-3 py-1.5 text-muted hover:bg-surface-2 hover:text-text">Find sponsors</Link>
            <Link href="/inbox" className="rounded-lg px-3 py-1.5 text-muted hover:bg-surface-2 hover:text-text">Inbox</Link>
            <Link href="/scan" className="rounded-lg px-3 py-1.5 text-muted hover:bg-surface-2 hover:text-text">Scanner</Link>
            <Link href="/" className="rounded-lg px-3 py-1.5 text-muted hover:bg-surface-2 hover:text-text">Open app</Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
    </div>
  );
}
