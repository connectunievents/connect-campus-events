import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { LoginButtons } from "@/components/login-buttons";
import { LogoMark } from "@/components/logo";

export const metadata = { title: "Sign in" };

function safeNext(next?: string) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getCurrentUser()) redirect(next);

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-md flex-col overflow-hidden px-6">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-leaf/20 blur-3xl" />
      <Link href="/" className="pt-safe relative mt-3 w-fit rounded-full bg-surface p-2" aria-label="Back">
        <ArrowLeft size={20} />
      </Link>

      <div className="relative flex flex-1 flex-col justify-center pb-16">
        <LogoMark size={56} />
        <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight">
          Your campus,
          <br />
          <span className="font-display italic text-leaf">all in one place.</span>
        </h1>
        <p className="mt-3 text-muted">Sign in to follow universities, get tickets and walk in with a QR code.</p>

        {sp.error && (
          <p className="mt-4 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            Sign-in failed: {sp.error}. Please try again.
          </p>
        )}

        <LoginButtons next={next} />

        <p className="mt-8 text-center text-xs text-muted">
          Tip: sign in with your <b className="text-text">university email</b> to unlock students-only events.
        </p>
      </div>
    </main>
  );
}
