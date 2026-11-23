import Link from "next/link";
import { WifiOff } from "lucide-react";

export const metadata = { title: "Offline" };

export default function Offline() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-8 text-center">
      <WifiOff size={48} className="text-leaf" />
      <h1 className="mt-4 text-2xl font-bold">You&apos;re offline</h1>
      <p className="mt-2 text-muted">Tickets you opened before still work. Reconnect to browse events.</p>
      <Link href="/tickets" className="mt-6 rounded-xl bg-leaf px-5 py-3 font-semibold text-ink">
        Open my tickets
      </Link>
    </main>
  );
}
